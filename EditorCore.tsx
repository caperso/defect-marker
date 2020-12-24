import { fabric } from "fabric";
import { observer, useObserver } from "mobx-react";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { SOLAR_DEFECT_TYPES } from "../../../../assets/js/constants";
import { CanvasImageRatio, Coord2d, Defect, ImageInfo, SolarDefect } from "../../../../typings/interface";
import "./DefectEditor.scss";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  disableGroupScales,
  drawRect,
  generateDefect,
  generateRegion,
  getDefectPaths,
  restrictCoord
} from "./methods";

interface Props {
  currentImage: ImageInfo;
  currentDefect: SolarDefect | undefined;
  defects: Defect[];
  setDefects: (props: any) => any;
  onLoaded?: () => any;
}

const imageConfig = {
  originX: "left",
  originY: "top",
};

export const EditorCore = observer(
  forwardRef((props: Props, ref) => {
    const { currentImage, currentDefect, defects, setDefects } = props;
    const infraredRef = useRef<HTMLCanvasElement | null>(null);
    const lightRef = useRef<HTMLCanvasElement | null>(null);

    const [infraredRatio, setInfraredRatio] = useState<CanvasImageRatio | null>(null);
    const [lightRatio, setLightRatio] = useState<CanvasImageRatio | null>(null);

    const [infraredImage, setInfraredImage] = useState<fabric.Image | null>(null);
    const [lightImage, setLightImage] = useState<fabric.Image | null>(null);

    const [infraredCanvas, setInfraredCanvas] = useState<fabric.Canvas>();
    const [lightCanvas, setLightCanvas] = useState<fabric.Canvas>();

    const [infraredPaths, setInfraredPaths] = useState<fabric.Path[]>();
    const [lightPaths, setLightPaths] = useState<fabric.Path[]>();

    // 加载fabric,初始化基础图像
    useEffect(() => {
      const initConfig = {
        stopContextMenu: true,
      };
      let infraredCanvas = new fabric.Canvas(infraredRef.current, initConfig);
      let lightCanvas = new fabric.Canvas(lightRef.current, initConfig);

      // 基本整体缩放
      infraredCanvas.on("mouse:wheel", (e) => {
        e.e.stopPropagation();
        const ev = e.e as WheelEvent;
        const delta = (ev.deltaY > 0 ? -0.1 : 0.1) + infraredCanvas.getZoom();
        infraredCanvas.zoomToPoint(new fabric.Point(ev.offsetX, ev.offsetY), delta);
      });
      lightCanvas.on("mouse:wheel", (e) => {
        e.e.stopPropagation();
        const ev = e.e as WheelEvent;
        const delta = (ev.deltaY > 0 ? -0.1 : 0.1) + lightCanvas.getZoom();
        lightCanvas.zoomToPoint(new fabric.Point(ev.offsetX, ev.offsetY), delta);
      });

      setInfraredCanvas(infraredCanvas);
      setLightCanvas(lightCanvas);
      return () => {
        console.log("UNLOAD");

        infraredCanvas?.dispose();
        lightCanvas?.dispose();
      };
    }, []);

    // 加载bg
    useEffect(() => {
      if (infraredCanvas && lightCanvas) {
        fabric.Image.fromURL(currentImage.infraredUrl, function (img: fabric.Image) {
          const ratioX = CANVAS_WIDTH / img.width!;
          const ratioY = CANVAS_HEIGHT / img.height!;
          const ratio = { x: ratioX, y: ratioY };
          setInfraredRatio((r) => (JSON.stringify(ratio) === JSON.stringify(r) ? r : ratio));
          setInfraredImage(img);
          img.set({
            scaleX: ratioX,
            scaleY: ratioY,
            ...imageConfig,
          });

          infraredCanvas.setBackgroundImage(img, infraredCanvas.renderAll.bind(infraredCanvas));
        });

        fabric.Image.fromURL(currentImage.lightUrl, function (img: fabric.Image) {
          const ratioX = CANVAS_WIDTH / img.width!;
          const ratioY = CANVAS_HEIGHT / img.height!;
          const ratio = { x: ratioX, y: ratioY };
          setLightRatio((r) => (JSON.stringify(ratio) === JSON.stringify(r) ? r : ratio));
          setLightImage(img);
          img.set({
            scaleX: ratioX,
            scaleY: ratioY,
            ...imageConfig,
          });

          lightCanvas.setBackgroundImage(img, lightCanvas?.renderAll.bind(lightCanvas));
        });
      }
    }, [currentImage, infraredCanvas, lightCanvas]);

    useEffect(() => {
      // infraredImage && infraredImage.dispose();
      // lightImage && lightImage.dispose();
    }, [infraredImage, lightImage]);

    // 监听鼠标选择事件
    useEffect(() => {
      if (infraredCanvas && infraredRatio && lightRatio && currentDefect === undefined) {
        infraredCanvas.on("object:moved", (e) => {
          const updatedDefects = groupMove(e, infraredRatio, lightRatio, defects);
          setDefects(updatedDefects);
        });
        infraredCanvas.on("object:scaled", (e) => {
          const updatedDefects = groupScale(e, infraredRatio, lightRatio, defects);
          setDefects(updatedDefects);
        });
        // 当前关闭 多个选择 内的整体缩放
        infraredCanvas.on("selection:created", disableGroupScales);
      }

      return () => {
        infraredCanvas?.off("object:moved");
        infraredCanvas?.off("object:scaled");
        infraredCanvas?.off("selection:created");
      };
    }, [infraredCanvas, defects, setDefects, currentDefect, infraredRatio, lightRatio]);

    // 监听绘制鼠标事件
    useEffect(() => {
      if (infraredCanvas && infraredRatio && lightRatio && currentDefect) {
        let drawingOn: boolean = false;
        let initCoord: Coord2d | undefined;
        let lastPath: fabric.Path | undefined;

        infraredCanvas.on("mouse:down", (e) => {
          initCoord = [e.absolutePointer!.x, e.absolutePointer!.y];
          drawingOn = true;
        });

        infraredCanvas.on("mouse:move", (e) => {
          if (drawingOn && initCoord) {
            const currentCoord = restrictCoord(e);
            const fabricPath = drawRect(initCoord, currentCoord, currentDefect.color);
            lastPath && infraredCanvas.remove(lastPath);
            infraredCanvas.add(fabricPath);
            lastPath = fabricPath;
            infraredCanvas.renderAll();
          }
        });

        infraredCanvas.on("mouse:up", (e) => {
          if (drawingOn && initCoord) {
            const currentCoord = restrictCoord(e);
            lastPath && infraredCanvas.remove(lastPath);
            lastPath = undefined;
            drawingOn = false;
            //TODO 生成一个defect, 传给server
            const region = generateRegion(initCoord, currentCoord, infraredRatio);
            const lightRegion = generateRegion(initCoord, currentCoord, lightRatio); //! 等待插件
            const index = SOLAR_DEFECT_TYPES.findIndex((t) => t.key === currentDefect.key);
            const newDefect = generateDefect(region, lightRegion, index);
            setDefects((s: any) => [...s, newDefect]);
          }
        });
      }
      return () => {
        infraredCanvas?.off("mouse:down");
        infraredCanvas?.off("mouse:move");
        infraredCanvas?.off("mouse:up");
        infraredCanvas?.off("mouse:moving");
      };
    }, [infraredCanvas, defects, setDefects, currentDefect, infraredRatio, lightRatio]);

    // 监听缺陷池,生成轨迹
    useEffect(() => {
      if (infraredCanvas && lightCanvas && infraredRatio && lightRatio) {
        const { infraredPaths, lightPaths } = getDefectPaths(defects, infraredRatio, lightRatio);

        setInfraredPaths(infraredPaths);
        setLightPaths(lightPaths);

        console.log("[re-paint]", infraredPaths, lightPaths);
      }
    }, [defects, infraredCanvas, lightCanvas, infraredRatio, lightRatio]);

    //  渲染缺陷
    useEffect(() => {
      if (infraredCanvas && lightCanvas && infraredPaths && lightPaths) {
        // 清理所有objects
        infraredCanvas.remove(...infraredCanvas.getObjects().concat());
        lightCanvas.remove(...lightCanvas.getObjects().concat());

        infraredPaths.forEach((p) => infraredCanvas.add(p));
        lightPaths.forEach((p) => lightCanvas.add(p));
      }

      return () => {
        // ! 当前发现内存泄漏!
      };
    }, [infraredCanvas, lightCanvas, infraredPaths, lightPaths]);

    // 缺陷选择状态下, 缺陷可选中
    useEffect(() => {
      if (infraredPaths) {
        !currentDefect
          ? infraredPaths.forEach((o) => (o.selectable = true))
          : infraredPaths.forEach((o) => (o.selectable = false));
      }
    }, [currentDefect, infraredPaths]);

    const groupScale = (
      e: fabric.IEvent,
      infraredRatio: CanvasImageRatio,
      lightRatio: CanvasImageRatio,
      defects: Defect[],
    ) => {
      const objects = (e.target! as any)._objects;
      const updatedDefects = [...defects];
      const { br, tl } = e.target!.aCoords!;

      if (objects) {
        return updatedDefects; // 不做整组缩放调整
      } else {
        const index = updatedDefects.findIndex((d) => d.id === e.target?.data.id);
        updatedDefects[index].region = `${tl.x / infraredRatio.x} ${tl.y / infraredRatio.y} ${br.x / infraredRatio.x} ${
          br.y / infraredRatio.y
        }`;
        updatedDefects[index].light_region = `${tl.x / lightRatio.x} ${tl.y / lightRatio.y} ${br.x / lightRatio.x} ${
          br.y / lightRatio.y
        }`;
        return updatedDefects;
      }
    };

    const groupMove = (
      e: fabric.IEvent,
      infraredRatio: CanvasImageRatio,
      lightRatio: CanvasImageRatio,
      defects: Defect[],
    ) => {
      const objects = (e.target! as any)._objects;
      // 多个对象移动 ?可有更好的接口?
      const updatedDefects = [...defects];
      const { br, tl } = e.target!.aCoords!;
      if (objects) {
        const center = [(br.x + tl.x) / 2, (br.y + tl.y) / 2];

        objects.forEach((o: fabric.Path) => {
          // 此处为相对center的坐标系
          const { br, tl } = o.aCoords!;
          const newTl = { x: tl.x + center[0], y: tl.y + center[1] };
          const newBr = { x: br.x + center[0], y: br.y + center[1] };
          const index = updatedDefects.findIndex((d) => d.id === o.data.id);
          updatedDefects[index].region = `${newTl.x / infraredRatio.x} ${newTl.y / infraredRatio.y} ${
            newBr.x / infraredRatio.x
          } ${newBr.y / infraredRatio.y}`;
          updatedDefects[index].light_region = `${newTl.x / lightRatio.x} ${newTl.y / lightRatio.y} ${
            newBr.x / lightRatio.x
          } ${newBr.y / lightRatio.y}`;
        });
        return updatedDefects;
      } else {
        const index = updatedDefects.findIndex((d) => d.id === e.target?.data.id);
        updatedDefects[index].region = `${tl.x / infraredRatio.x} ${tl.y / infraredRatio.y} ${br.x / infraredRatio.x} ${
          br.y / infraredRatio.y
        }`;
        updatedDefects[index].light_region = `${tl.x / lightRatio.x} ${tl.y / lightRatio.y} ${br.x / lightRatio.x} ${
          br.y / lightRatio.y
        }`;
        return updatedDefects;
      }
    };

    // 外置方法:重置bg/删除选中/复制选中
    useImperativeHandle(ref, () => ({
      resetBackground() {
        infraredCanvas?.setViewportTransform([1, 0, 0, 1, 0, 0]);
        lightCanvas?.setViewportTransform([1, 0, 0, 1, 0, 0]);
      },

      duplicateSelection() {
        const oldDefects = infraredCanvas?.getActiveObjects().map((o) => o.data) as Defect[];
        setDefects((s: Defect[]) => {
          const newDefects = oldDefects?.map((o) => generateDefect(o.region, o.light_region, o.defect_type));
          return [...s, ...newDefects];
        });
      },

      removeSelection() {
        const oldDefects = infraredCanvas?.getActiveObjects().map((o) => o.data);
        setDefects((s: Defect[]) => {
          const updatedDefects = [...s].filter((d) => !oldDefects?.find((old) => old.id === d.id));
          return updatedDefects;
        });
      },
    }));

    return useObserver(() => (
      <div className="editor-canvas">
        <canvas id="infrared-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={infraredRef} />
        <canvas id="light-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={lightRef} />
      </div>
    ));
  }),
);

// interface State {
//   infraredRatio: CanvasImageRatio | null;
//   lightRatio: CanvasImageRatio | null;
//   infraredCanvas: fabric.Canvas | null;
//   lightCanvas: fabric.Canvas | null;
// }

// export class EditorCore extends Component<Props, State> {
//   public infraredRef: RefObject<HTMLCanvasElement>;
//   public lightRef: RefObject<HTMLCanvasElement>;

//   constructor(props: Props) {
//     super(props);
//     this.state = {
//       infraredRatio: null,
//       lightRatio: null,
//       infraredCanvas: null,
//       lightCanvas: null,
//     };
//     this.infraredRef = createRef<HTMLCanvasElement>();
//     this.lightRef = createRef<HTMLCanvasElement>();
//   }

//   componentDidMount() {
//     this.initCanvas();
//   }

//   // 加载fabric,初始化基础图像
//   initCanvas = () => {
//     if (this.infraredRef.current && currentImage) {
//       const initConfig = {
//         stopContextMenu: true,
//       };
//       let infraredCanvas = new fabric.Canvas(this.infraredRef.current, initConfig);
//       let lightCanvas = new fabric.Canvas(this.lightRef.current, initConfig);

//       const imageConfig = {
//         originX: "left",
//         originY: "top",
//       };

//       fabric.Image.fromURL(currentImage.infraredUrl, (img: any) => {
//         const ratioX = CANVAS_WIDTH / img.width;
//         const ratioY = CANVAS_HEIGHT / img.height;
//         const ratio = { x: ratioX, y: ratioY };
//         this.setState({ infraredRatio: ratio });
//         img.set({
//           scaleX: ratioX,
//           scaleY: ratioY,
//           ...imageConfig,
//         });
//         infraredCanvas.setBackgroundImage(img, infraredCanvas.renderAll.bind(infraredCanvas));
//       });

//       fabric.Image.fromURL(currentImage.lightUrl, (img: any) => {
//         const ratioX = CANVAS_WIDTH / img.width;
//         const ratioY = CANVAS_HEIGHT / img.height;
//         const ratio = { x: ratioX, y: ratioY };
//         this.setState({ lightRatio: ratio });
//         img.set({
//           scaleX: ratioX,
//           scaleY: ratioY,
//           ...imageConfig,
//         });
//         lightCanvas.setBackgroundImage(img, lightCanvas.renderAll.bind(lightCanvas));
//       });

//       infraredCanvas.on("mouse:wheel", (e) => {
//         const ev = e.e as WheelEvent;
//         const delta = (ev.deltaY > 0 ? -0.1 : 0.1) + infraredCanvas.getZoom();
//         infraredCanvas.zoomToPoint(new fabric.Point(ev.offsetX, ev.offsetY), delta);
//       });
//       lightCanvas.on("mouse:wheel", (e) => {
//         const ev = e.e as WheelEvent;
//         const delta = (ev.deltaY > 0 ? -0.1 : 0.1) + lightCanvas.getZoom();
//         lightCanvas.zoomToPoint(new fabric.Point(ev.offsetX, ev.offsetY), delta);
//       });

//       this.setState({ infraredCanvas, lightCanvas });
//     }
//   };

//   initListeners = () => {
//     const infraredCanvas = this.state.infraredCanvas;
//     const infraredRatio = this.state.infraredRatio;
//     const lightRatio = this.state.lightRatio;
//     const currentDefect = this.props.currentDefect;

//     if (infraredCanvas && infraredRatio && lightRatio) {
//       if (!currentDefect) {
//         infraredCanvas.off("mouse:down");
//         infraredCanvas.off("mouse:up");
//       } else {
//         let drawingOn: boolean = false;
//         let initCoord: Coord2d | undefined;
//         let lastPath: fabric.Path | undefined;

//         infraredCanvas.on("mouse:down", (e) => {
//           initCoord = [e.absolutePointer!.x, e.absolutePointer!.y];
//           console.log(e);
//           drawingOn = true;
//         });

//         infraredCanvas.on("mouse:move", (e) => {
//           if (drawingOn && initCoord) {
//             const currentCoord = restrictCoord(e);
//             const fabricPath = drawRect(initCoord, currentCoord, currentDefect.color);
//             lastPath && infraredCanvas.remove(lastPath);
//             infraredCanvas.add(fabricPath);
//             lastPath = fabricPath;
//             infraredCanvas.renderAll();
//           }
//         });

//         infraredCanvas.on("mouse:up", (e) => {
//           if (drawingOn && initCoord) {
//             const currentCoord = restrictCoord(e);
//             lastPath && infraredCanvas.remove(lastPath);
//             lastPath = undefined;
//             drawingOn = false;
//             // 生成一个defect, 传给server
//             const region = generateRegion(initCoord, currentCoord, infraredRatio);
//             const lightRegion = generateRegion(initCoord, currentCoord, lightRatio); //! 等待插件
//             const index = SOLAR_DEFECT_TYPES.findIndex((t) => t.key === currentDefect.key);
//             const newDefect = generateDefect(region, lightRegion, index);
//             this.props.setDefects((s: any) => [...s, newDefect]);
//           }
//         });
//       }
//     }
//   };

//   componentDidUpdate(props: Props) {
//     this.initListeners()
//     const infraredCanvas = this.state.infraredCanvas;
//     const infraredRatio = this.state.infraredRatio;
//     const lightRatio = this.state.lightRatio;
//     const lightCanvas = this.state.lightCanvas;
//     const defects = props.defects;
//     // 清理所有objects
//     if (infraredCanvas && lightCanvas && infraredRatio && lightRatio) {
//       infraredCanvas.remove(...infraredCanvas.getObjects().concat());
//       lightCanvas.remove(...lightCanvas.getObjects().concat());

//       const { infraredPaths, lightPaths } = getDefectPaths(defects, infraredRatio, lightRatio);

//       infraredPaths.forEach((p) => infraredCanvas.add(p));
//       lightPaths.forEach((p) => lightCanvas.add(p));

//       infraredCanvas.renderAll();
//       lightCanvas.renderAll();
//       console.log("[re-paint]", infraredPaths, lightPaths);
//     }
//   }

//   render() {
//     return (
//       <div className="editor-canvas">
//         <canvas id="infrared-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={this.infraredRef} />
//         <canvas id="light-canvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={this.lightRef} />
//       </div>
//     );
//   }
// }
