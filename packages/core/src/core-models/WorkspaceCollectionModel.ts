import { WorkspaceModel, SerializedModel, WorkspaceModelListener } from './WorkspaceModel';
import { WorkspaceEngine } from '../core/WorkspaceEngine';
import { WorkspaceCollectionInterface } from './WorkspaceCollectionInterface';
import { WorkspaceModelFactory } from '../core/WorkspaceModelFactory';
import * as _ from 'lodash';
import { Alignment } from '../core/tools';

export interface SerializedCollectionModel extends SerializedModel {
  children: SerializedModel[];
  type: string;
}

export interface WorkspaceCollectionModelListener extends WorkspaceModelListener {
  childRemoved?: (node: WorkspaceModel) => any;
}

export class WorkspaceCollectionModel<
    S extends SerializedCollectionModel = SerializedCollectionModel,
    L extends WorkspaceCollectionModelListener = WorkspaceCollectionModelListener
  >
  extends WorkspaceModel<S, L>
  implements WorkspaceCollectionInterface
{
  children: WorkspaceModel[];

  constructor(type: string) {
    super(type);
    this.children = [];
  }

  fromArray(payload: S, engine: WorkspaceEngine) {
    super.fromArray(payload, engine);
    for (let child of payload.children) {
      let factory: WorkspaceModelFactory;
      try {
        factory = engine.getFactory(child.type);
      } catch (ex) {
        continue;
      }

      let model: any = factory.generateModel();
      model.fromArray(child, engine);
      this.addModel(model);
    }
  }

  toArray(): S {
    return {
      ...super.toArray(),
      children: this.children.map((child) => {
        return child.toArray();
      })
    } as S;
  }

  isFirstModel(model: WorkspaceModel): boolean {
    return this.children[0].id === model.id;
  }

  isLastModel(model: WorkspaceModel): boolean {
    return this.children[this.children.length - 1].id === model.id;
  }

  flatten() {
    const children = _.flatMap(this.children.map((c) => c.flatten()));
    return super.flatten().concat(children);
  }

  getFlattened(): WorkspaceModel[] {
    let children = [];
    for (let child of this.children) {
      if (child instanceof WorkspaceCollectionModel) {
        children = children.concat(child.getFlattened());
      } else {
        children.push(child);
      }
    }
    return children;
  }

  replaceModel(oldModel: WorkspaceModel, newModel): this {
    let index = this.children.indexOf(oldModel);
    oldModel.delete();
    this.addModel(newModel, index);
    return this;
  }

  getModelBefore(model: WorkspaceModel) {
    const index = this.children.indexOf(model);
    if (index <= 0) {
      return null;
    }
    return this.children[index - 1];
  }

  getModelAfter(model: WorkspaceModel) {
    const index = this.children.indexOf(model);
    if (index >= this.children.length - 1) {
      return null;
    }
    return this.children[index + 1];
  }

  normalize() {
    if (this.parent && this.parent instanceof WorkspaceCollectionModel) {
      if (this.children.length === 0) {
        this.parent.removeModel(this);
      } else if (this.children.length === 1) {
        this.parent.replaceModel(this, this.children[0]);
      }
    }
  }

  removeModel(model: WorkspaceModel): this {
    let index = this.children.indexOf(model);
    if (index === -1) {
      console.log('could not find model');
      return this;
    }
    this.children.splice(index, 1);
    this.invalidateLayout();
    return this;
  }

  addModel(model: WorkspaceModel, position: number = null): this {
    if (this.children.indexOf(model) !== -1) {
      const pos = this.children.indexOf(model);
      this.children.splice(pos, 1);
      if (pos > position) {
        this.children.splice(position, 0, model);
      } else {
        this.children.splice(position - 1, 0, model);
      }
    } else {
      if (model.parent) {
        model.delete();
      }
      model.setParent(this);

      // allow a child to remove itself
      const listener = model.registerListener({
        removed: () => {
          listener();
          this.removeModel(model);
          this.iterateListeners((list) => {
            list.childRemoved?.(model);
          });
        },
        layoutInvalidated: () => {
          this.invalidateLayout();
        },
        dimensionsInvalidated: () => {
          this.invalidateDimensions();
        }
      });

      if (position === null) {
        this.children.push(model);
      } else {
        this.children.splice(position, 0, model);
      }
    }
    this.invalidateLayout();
    return this;
  }

  addModelBefore(relativeModel: WorkspaceModel, model: WorkspaceModel) {
    let index = this.children.indexOf(relativeModel);
    this.addModel(model, index);
  }

  addModelAfter(relativeModel: WorkspaceModel, model: WorkspaceModel) {
    let index = this.children.indexOf(relativeModel);
    this.addModel(model, index + 1);
  }

  getChildSibling(model: WorkspaceModel, alignment: Alignment): WorkspaceModel {
    return null;
  }
}
