import { DirectionLayoutChildDirective } from '../../widgets/layouts/DirectionalChildWidget';
import { ResizeDivision, WorkspaceNodeModel } from './WorkspaceNodeModel';
import { WorkspaceModel } from '../../core-models/WorkspaceModel';

export interface ExpandNodeModelChild {
  originalWidth: number;
  originalHeight: number;
}

/**
 * This is a smarter version of the standard Node model which can work with
 * panels that expand, and treats them like standard panels, allowing them to resize
 */
export class ExpandNodeModel extends WorkspaceNodeModel {
  dimensions: Map<WorkspaceModel, ExpandNodeModelChild>;
  rendered: Set<WorkspaceModel>;
  queuedForInitialSizeCheck: Set<WorkspaceModel>;

  constructor() {
    super();
    this.dimensions = new Map();
    this.rendered = new Set();
    this.queuedForInitialSizeCheck = new Set();
  }

  recomputeInitialSizes() {
    this.rendered.clear();
    this.children.forEach((model) => {
      if (this.queuedForInitialSizeCheck.has(model)) {
        return;
      }
      this.queuedForInitialSizeCheck.add(model);
      const l1 = model.r_dimensions.registerListener({
        updated: () => {
          l1();
          this.queuedForInitialSizeCheck.delete(model);
          this.rendered.add(model);
          if (this.queuedForInitialSizeCheck.size === 0) {
            this.recomputeSizes();
            this.invalidateLayout();
          }
        }
      });
    });
    this.invalidateLayout();
  }

  addModel(model: WorkspaceModel, position: number = null): this {
    super.addModel(model, position);
    // model want to expand, store their original sizes so we can revert when we add them somewhere else
    if ((this.vertical && model.expandVertical) || (!this.vertical && model.expandHorizontal)) {
      this.dimensions.set(model, {
        originalWidth: model.size.width,
        originalHeight: model.size.height
      });
      const l2 = model.registerListener({
        removed: () => {
          l2?.();
          model.setSize({
            width: this.dimensions.get(model).originalWidth,
            height: this.dimensions.get(model).originalHeight
          });
          this.dimensions.delete(model);
        }
      });
    }
    // model wants to shrink, reset its size so it renders as small as possible (initially)
    else if ((this.vertical && !model.expandVertical) || (!this.vertical && !model.expandHorizontal)) {
      model.setSize({
        width: 0,
        height: 0
      });
    }
    this.recomputeInitialSizes();
    return this;
  }

  recomputeSizes() {
    const dims = Array.from(this.dimensions.keys());
    for (let i = 0; i < dims.length - 1; i++) {
      if (this.vertical) {
        dims[i].setHeight(dims[i].r_dimensions.size.height);
      } else {
        dims[i].setWidth(dims[i].r_dimensions.size.width);
      }
    }
  }

  getResizeDivisions(): ResizeDivision[] {
    let divs: ResizeDivision[] = [];
    for (let i = 1; i < this.r_divisons.length - 1; i++) {
      divs.push({
        before: this.children[i - 1],
        after: this.children[i],
        dimensions: this.r_divisons[i],
        vertical: !this.vertical
      });
    }
    return divs;
  }

  getPanelDirective(child: WorkspaceModel): DirectionLayoutChildDirective {
    //no expand nodes, so treat the last one as the expand node
    if (this.dimensions.size === 0 && this.children.indexOf(child) === this.children.length - 1) {
      return {
        ...super.getPanelDirective(child),
        expand: true
      };
    }
    // make the first expand nodes operate like a normal node
    else if (
      this.dimensions.size > 1 &&
      Array.from(this.dimensions.keys()).indexOf(child) < this.dimensions.size - 1 &&
      this.rendered.has(child)
    ) {
      return {
        ...super.getPanelDirective(child),
        expand: false
      };
    }

    return super.getPanelDirective(child);
  }
}
