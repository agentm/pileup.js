/**
 * Visualization of variants
 * @flow
 */
'use strict';
import {AllelFrequencyStrategy} from '../types';


import type {VcfDataSource} from '../sources/VcfDataSource';
import type {Variant} from '../data/vcf';
import type {DataCanvasRenderingContext2D} from 'data-canvas';
import type {VizProps} from '../VisualizationWrapper';
import type {Scale} from './d3utils';

import React from 'react';
import ReactDOM from 'react-dom';

import d3utils from './d3utils';
import shallowEquals from 'shallow-equals';
import ContigInterval from '../ContigInterval';
import canvasUtils from './canvas-utils';
import dataCanvas from 'data-canvas';
import style from '../style';

class VariantTrack extends React.Component {
  props: VizProps & {source: VcfDataSource};

  state: void;

  constructor(props: Object) {
    super(props);
  }

  render(): any {
      return <canvas onClick={this.handleClick.bind(this)} onMouseMove={this.handleMouseMove.bind(this)} onMouseLeave={this.handleMouseLeave.bind(this)}/>;
  }

  componentDidMount() {
    this.updateVisualization();

    this.props.source.on('newdata', () => {
      this.updateVisualization();
    });
  }

  getScale(): Scale {
    return d3utils.getTrackScale(this.props.range, this.props.width);
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (!shallowEquals(prevProps, this.props) ||
        !shallowEquals(prevState, this.state)) {
      this.updateVisualization();
    }
  }

  updateVisualization() {
    var canvas = ReactDOM.findDOMNode(this),
        {width, height} = this.props;

    // Hold off until height & width are known.
    if (width === 0) return;

    d3utils.sizeCanvas(canvas, width, height);
    var ctx = canvasUtils.getContext(canvas);
    var dtx = dataCanvas.getDataContext(ctx);
    this.renderScene(dtx);
  }

  renderScene(ctx: DataCanvasRenderingContext2D) {
    var range = this.props.range,
        interval = new ContigInterval(range.contig, range.start, range.stop),
        variants = this.props.source.getFeaturesInRange(interval),
        scale = this.getScale(),
        height = this.props.height,
        y = height - style.VARIANT_HEIGHT - 1;
      
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.reset();
    ctx.save();

    ctx.fillStyle = style.VARIANT_FILL;
    ctx.strokeStyle = style.VARIANT_STROKE;
    variants.forEach(variant => {
      var variantHeightRatio = 1.0;
      if (this.props.options.variantHeightByFrequency) {
        var frequency = null;
        if (this.props.options.allelFrequencyStrategy === undefined) { //default startegy
          frequency = variant.majorFrequency;
        } else if (this.props.options.allelFrequencyStrategy === AllelFrequencyStrategy.Major) {
          frequency = variant.majorFrequency;
        } else if (this.props.options.allelFrequencyStrategy === AllelFrequencyStrategy.Minor) {
          frequency = variant.minorFrequency;
        } else {
          console.log("Unknown AllelFrequencyStrategy: ",this.props.options.allelFrequencyStrategy);
        }
        if (frequency !== null && frequency !== undefined) {
          variantHeightRatio = frequency;
        }
      }
      var height = style.VARIANT_HEIGHT*variantHeightRatio;
      var variantY = y - 0.5 + style.VARIANT_HEIGHT - height;
      var variantX = Math.round(scale(variant.position)) - 0.5;
      var width = Math.round(scale(variant.position + 1)) - 0.5 - variantX;

      ctx.pushObject(variant);

      ctx.fillRect(variantX, variantY, width, height);
      ctx.strokeRect(variantX, variantY, width, height);
      ctx.popObject();
    });

    ctx.restore();
  }

  handleMouseMove(reactEvent: any)
      {
	  var info = this.mouseInfo(reactEvent);
	  if (typeof this.props.options.onVariantMouseMove === "function") {
              this.props.options.onVariantMouseMove(info.variants,info.event);
	  } else if (info.variants.length > 0) {
              console.log("Variants mouse move: ", info.variants, info.event);
	  }
      }

  handleMouseLeave(reactEvent: any)
    {
	  var info = this.mouseInfo(reactEvent);
	  if (typeof this.props.options.onVariantMouseLeave === "function") {
              this.props.options.onVariantMouseLeave(info.variants,info.event);
	  }
    }
  mouseInfo(reactEvent: any) {
      var ev = reactEvent.nativeEvent,
          x = ev.offsetX,
          y = ev.offsetY,
          canvas = ReactDOM.findDOMNode(this),
          ctx = canvasUtils.getContext(canvas),
          trackingCtx = new dataCanvas.ClickTrackingContext(ctx, x, y);

      this.renderScene(trackingCtx);      

      var variants = trackingCtx.hit;
      var data = [];
     
      if (variants && variants.length>0) {
        for (var i=0;i<variants.length;i++) {
          data.push({
            id:       variants[i].id,
            vcfLine:  variants[i].vcfLine,
            position: variants[i].position,
            ref:      variants[i].ref,
            alt:      variants[i].alt});
        }
      }
      return {variants:data,
	      event:ev};
  }

  handleClick(reactEvent: any) {
    var info = this.mouseInfo(reactEvent)
      if (typeof this.props.options.onVariantClicked  === "function") {
          this.props.options.onVariantClicked(info.variants,info.event);
      } else {
          console.log("Variants clicked: ", info.variants, info.event);
      }
  }
}


VariantTrack.displayName = 'variants';

module.exports = VariantTrack;
