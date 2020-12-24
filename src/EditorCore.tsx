import { fabric } from "fabric";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import {
  CanvasImageRatio,
  Coord2d,
  Defect,
  ImageInfo,
  SolarDefect
} from "./interface";
import "./DefectEditor.scss";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  disableGroupScales,
  drawRect,
  generateDefect,
  generateRegion,
  getDefectPaths,
  groupMove,
  groupScale,
  restrictCoord,
  SOLAR_DEFECT_TYPES
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
  originY: "top"
};

export const EditorCore = forwardRef((props: Props, ref) => {
  const { currentImage, currentDefect, defects, setDefects } = props;
  const infraredRef = useRef<HTMLCanvasElement | null>(null);
  const lightRef = useRef<HTMLCanvasElement | null>(null);

  const [infraredRatio, setInfraredRatio] = useState<CanvasImageRatio | null>(
    null
  );
  const [lightRatio, setLightRatio] = useState<CanvasImageRatio | null>(null);

  const infraredImage = useRef<fabric.Image | null>(null);
  const lightImage = useRef<fabric.Image | null>(null);

  const [infraredCanvas, setInfraredCanvas] = useState<fabric.Canvas>();
  const [lightCanvas, setLightCanvas] = useState<fabric.Canvas>();

  const [infraredPaths, setInfraredPaths] = useState<fabric.Path[]>();
  const [lightPaths, setLightPaths] = useState<fabric.Path[]>();

  // 加载fabric,初始化基础图像
  useEffect(() => {
    const initConfig = {
      stopContextMenu: true
    };
    let infraredCanvas = new fabric.Canvas(infraredRef.current, initConfig);
    let lightCanvas = new fabric.Canvas(lightRef.current, initConfig);

    // 基本整体缩放
    infraredCanvas.on("mouse:wheel", (e) => {
      e.e.stopPropagation();
      const ev = e.e as WheelEvent;
      const delta = (ev.deltaY > 0 ? -0.1 : 0.1) + infraredCanvas.getZoom();
      infraredCanvas.zoomToPoint(
        new fabric.Point(ev.offsetX, ev.offsetY),
        delta
      );
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
      fabric.Image.fromURL(currentImage.infraredUrl, function (
        img: fabric.Image
      ) {
        const ratioX = CANVAS_WIDTH / img.width!;
        const ratioY = CANVAS_HEIGHT / img.height!;
        const ratio = { x: ratioX, y: ratioY };
        setInfraredRatio((r) =>
          JSON.stringify(ratio) === JSON.stringify(r) ? r : ratio
        );
        infraredImage.current = img;
        img.set({
          scaleX: ratioX,
          scaleY: ratioY,
          ...imageConfig
        });

        infraredCanvas.setBackgroundImage(
          img,
          infraredCanvas.renderAll.bind(infraredCanvas)
        );
      });

      fabric.Image.fromURL(currentImage.lightUrl, function (img: fabric.Image) {
        const ratioX = CANVAS_WIDTH / img.width!;
        const ratioY = CANVAS_HEIGHT / img.height!;
        const ratio = { x: ratioX, y: ratioY };
        setLightRatio((r) =>
          JSON.stringify(ratio) === JSON.stringify(r) ? r : ratio
        );
        infraredImage.current = img;
        img.set({
          scaleX: ratioX,
          scaleY: ratioY,
          ...imageConfig
        });

        lightCanvas.setBackgroundImage(
          img,
          lightCanvas?.renderAll.bind(lightCanvas)
        );
      });
    }
  }, [currentImage, infraredCanvas, lightCanvas]);

  useEffect(() => {
    infraredImage.current?.dispose();
    lightImage.current?.dispose();
  }, [currentImage]);

  // 监听鼠标选择事件
  useEffect(() => {
    if (
      infraredCanvas &&
      infraredRatio &&
      lightRatio &&
      currentDefect === undefined
    ) {
      infraredCanvas.on("object:moved", (e) => {
        const updatedDefects = groupMove(e, infraredRatio, lightRatio, defects);
        setDefects(updatedDefects);
      });
      infraredCanvas.on("object:scaled", (e) => {
        const updatedDefects = groupScale(
          e,
          infraredRatio,
          lightRatio,
          defects
        );
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
  }, [
    infraredCanvas,
    defects,
    setDefects,
    currentDefect,
    infraredRatio,
    lightRatio
  ]);

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
          const fabricPath = drawRect(
            initCoord,
            currentCoord,
            currentDefect.color
          );
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
          const lightRegion = generateRegion(
            initCoord,
            currentCoord,
            lightRatio
          ); //! 等待插件
          const index = SOLAR_DEFECT_TYPES.findIndex(
            (t) => t.key === currentDefect.key
          );
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
  }, [
    infraredCanvas,
    defects,
    setDefects,
    currentDefect,
    infraredRatio,
    lightRatio
  ]);

  // 监听缺陷池,生成轨迹
  useEffect(() => {
    if (infraredCanvas && lightCanvas && infraredRatio && lightRatio) {
      const { infraredPaths, lightPaths } = getDefectPaths(
        defects,
        infraredRatio,
        lightRatio
      );

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

  // 外置方法:重置bg/删除选中/复制选中
  useImperativeHandle(ref, () => ({
    resetBackground() {
      infraredCanvas?.setViewportTransform([1, 0, 0, 1, 0, 0]);
      lightCanvas?.setViewportTransform([1, 0, 0, 1, 0, 0]);
    },

    duplicateSelection() {
      const oldDefects = infraredCanvas
        ?.getActiveObjects()
        .map((o) => o.data) as Defect[];
      setDefects((s: Defect[]) => {
        const newDefects = oldDefects?.map((o) =>
          generateDefect(o.region, o.light_region, o.defect_type)
        );
        return [...s, ...newDefects];
      });
    },

    removeSelection() {
      const oldDefects = infraredCanvas?.getActiveObjects().map((o) => o.data);
      setDefects((s: Defect[]) => {
        const updatedDefects = [...s].filter(
          (d) => !oldDefects?.find((old) => old.id === d.id)
        );
        return updatedDefects;
      });
    }
  }));

  return (
    <div className="editor-canvas">
      <canvas
        id="infrared-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        ref={infraredRef}
      />
      <canvas
        id="light-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        ref={lightRef}
      />
    </div>
  );
});
