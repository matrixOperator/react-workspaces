import {
  SerializedCollectionModel,
  WorkspaceCollectionModel,
  WorkspaceCollectionModelListener,
  WorkspaceModel
} from '@projectstorm/react-workspaces-core';
import * as _ from 'lodash';

export interface WorkspaceTabModelListener extends WorkspaceCollectionModelListener {
  selectionChanged: () => any;
}

export interface WorkspaceTabModelSerialized extends SerializedCollectionModel {
  selected: string;
}

export class WorkspaceTabModel extends WorkspaceCollectionModel<
  WorkspaceTabModelSerialized,
  WorkspaceTabModelListener
> {
  protected selected: string;

  static NAME = 'tabs';

  constructor() {
    super(WorkspaceTabModel.NAME);
    this.selected = null;
  }

  addModel(model: WorkspaceModel, position: number = null): this {
    super.addModel(model, position);
    this.setSelected(model);
    return this;
  }

  removeModel(model: WorkspaceModel): this {
    super.removeModel(model);
    if (this.selected === model.id && this.children.length > 0) {
      this.setSelected(this.children[0]);
    }
    return this;
  }

  getSelected(): WorkspaceModel {
    return _.find(this.children, { id: this.selected });
  }

  setSelected(model: WorkspaceModel): this {
    this.selected = model.id;
    this.iterateListeners((cb) => cb.selectionChanged?.());
    return this;
  }
}
