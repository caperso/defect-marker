import { fabric } from "fabric";
import { CanvasImageRatio, Coord2d, Defect } from "./interface";

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 450;
export const RATIO = 600 / 450;
const defaultPathConfig = {
  strokeWidth: 2,
  fill: "transparent",
  hasRotatingPoint: false,
  lockRotation: true,
  selectable: false,
  cornerSize: 6,
  transparentCorners: false,
  cornerColor: "white",
  borderColor: "white"
};

export const SOLAR_DEFECT_TYPES: any[] = [
  {
    title: "点状热斑",
    dataIndex: "point",
    key: "point",
    color: "rgba(255,1,1,1)"
  },
  {
    title: "条状热斑",
    dataIndex: "belt",
    key: "belt",
    color: "rgba(255,169,0,1)"
  },
  {
    title: "多斑",
    dataIndex: "multi",
    key: "multi",
    color: "rgb(68, 0, 255)"
  },
  {
    title: "空载",
    dataIndex: "empty",
    key: "empty",
    color: "rgba(40,213,204,1)"
  },
  {
    title: "缺失",
    dataIndex: "lost",
    key: "lost",
    color: "rgba(0,82,255,1)"
  },
  {
    title: "遮挡",
    dataIndex: "underShades",
    key: "underShades",
    color: "rgb(213, 40, 199)"
  },
  {
    title: "其它",
    dataIndex: "else",
    key: "else",
    color: "rgb(36, 192, 101)"
  }
];

/**
 * 限制鼠标坐标, 防止过界
 * @export
 * @param {fabric.IEvent} e
 * @returns {Coord2d}
 */
export function restrictCoord(e: fabric.IEvent): Coord2d {
  let { x, y } = e.absolutePointer!;
  x = x < 0 ? 0 : x > CANVAS_WIDTH ? CANVAS_WIDTH : x;
  y = y < 0 ? 0 : y > CANVAS_HEIGHT ? CANVAS_HEIGHT : y;
  return [x, y];
}

export function drawRect(prevCoord: Coord2d, coord: Coord2d, color: string) {
  const x0 = prevCoord[0];
  const y0 = prevCoord[1];
  const x = coord[0];
  const y = coord[1];

  const drawPath: any = [
    ["M", x0, y0],
    ["L", x, y0],
    ["L", x, y],
    ["L", x0, y],
    ["z"]
  ];

  return new fabric.Path(drawPath, {
    stroke: color,
    ...defaultPathConfig
  });
}

/**
 * 对任何fabric-object对象增加监听: 最终操作相应defect对象
 * @export
 * @param {fabric.Object} fabricObject
 * @param {(updatedDefect: Defect) => void} setter
 * @param {CanvasImageRatio} infraredRatio
 * @param {CanvasImageRatio} lightRatio
 */
export function addObjectListeners(
  fabricObject: fabric.Object,
  setter: (updatedDefect: Defect) => void,
  infraredRatio: CanvasImageRatio,
  lightRatio: CanvasImageRatio
) {
  /**
   * fabric-object 变形动作监听
   * @param {fabric.IEvent} e
   */
  function transformCallbackAct(e: fabric.IEvent) {
    const { br, tl } = e.target!.aCoords!;
    // 方向: canvas坐标=>region实际坐标 所以除以比例
    const updatedRegion = `${tl.x / infraredRatio.x} ${
      tl.y / infraredRatio.y
    } ${br.x / infraredRatio.x} ${br.y / infraredRatio.y}`;
    const updatedLightRegion = `${tl.x / lightRatio.x} ${tl.y / lightRatio.y} ${
      br.x / lightRatio.x
    } ${br.y / lightRatio.y}`;
    const updatedDefect: Defect = {
      ...e.target!.data,
      region: updatedRegion,
      light_region: updatedLightRegion
    };
    setter(updatedDefect);
  }
  fabricObject.on("scaled", (e) => {
    transformCallbackAct(e);
    console.log("[fabric-object] scaled", { e });
  });
  fabricObject.on("moved", (e) => {
    transformCallbackAct(e);
    console.log("[fabric-object] moved", { e });
  });
}

export function getDefectPaths(
  defects: Defect[],
  infraredRatio: CanvasImageRatio,
  lightRatio: CanvasImageRatio
) {
  const infraredPaths = defects.map((d) => {
    // a region likes "200 100 400 600"
    const seq = d.region.split(" ").map((s) => +s);
    const drawPath: any = [
      ["M", seq[0] * infraredRatio.x, seq[1] * infraredRatio.y],
      ["L", seq[2] * infraredRatio.x, seq[1] * infraredRatio.y],
      ["L", seq[2] * infraredRatio.x, seq[3] * infraredRatio.y],
      ["L", seq[0] * infraredRatio.x, seq[3] * infraredRatio.y],
      ["L", seq[0] * infraredRatio.x, seq[1] * infraredRatio.y],
      ["z"]
    ];

    const pathObject = new fabric.Path(drawPath, {
      ...defaultPathConfig,
      data: d,
      objectCaching: false,
      stroke: SOLAR_DEFECT_TYPES[d.defect_type!].color
    });
    pathObject.setControlsVisibility({ mtr: false });

    return pathObject;
  });

  const lightPaths = defects.map((d) => {
    const seq = d.light_region.split(" ").map((s) => +s);
    const drawPath: any = [
      ["M", seq[0] * lightRatio.x, seq[1] * lightRatio.y],
      ["L", seq[2] * lightRatio.x, seq[1] * lightRatio.y],
      ["L", seq[2] * lightRatio.x, seq[3] * lightRatio.y],
      ["L", seq[0] * lightRatio.x, seq[3] * lightRatio.y],
      ["L", seq[0] * lightRatio.x, seq[1] * lightRatio.y],
      ["z"]
    ];

    const pathObject = new fabric.Path(drawPath, {
      ...defaultPathConfig,
      data: d,
      stroke: SOLAR_DEFECT_TYPES[d.defect_type!].color
    });
    pathObject.setControlsVisibility({ mtr: false });

    return pathObject;
  });

  return { infraredPaths, lightPaths };
}

export function generateRegion(
  coord1: Coord2d,
  coord2: Coord2d,
  ratio: CanvasImageRatio
) {
  return `${coord1[0] / ratio.x} ${coord1[1] / ratio.y} ${
    coord2[0] / ratio.x
  } ${coord2[1] / ratio.y}`;
}

/**
 * 关闭组缩放, 关闭上部旋转按钮
 * @export
 * @param {fabric.IEvent} e
 */
export function disableGroupScales(e: fabric.IEvent) {
  if ((e.target as any)["_objects"]) {
    e.target!.set({
      cornerSize: 0,
      lockScalingX: true,
      lockScalingY: true
    });
    e.target?.setControlsVisibility({ mtr: false });
  }
}

export function generateDefect(
  region: string,
  lightRegion: string,
  typeIndex: number
) {
  //! FAKE
  const defect: Defect = {
    altitude: "167.493",
    create_time: "2020-12-04 13:36:46",
    defect_type: typeIndex,
    flag: "",
    gps: "",
    homography: "",
    id: Math.floor(Math.random() * 10000),
    infrared_name: "DJI_0436_R.JPG",
    is_deleted: "0",
    latitude: "46.37528991733333",
    light_name: "DJI_0435.JPG",
    light_region: lightRegion,
    longitude: "125.189338684",
    mark: "",
    name: "",
    packet: 72,
    point: 1203,
    project: 7,
    region: region,
    update_time: "2020-12-04 13:36:46"
  };
  return defect;
}

export const groupScale = (
  e: fabric.IEvent,
  infraredRatio: CanvasImageRatio,
  lightRatio: CanvasImageRatio,
  defects: Defect[]
) => {
  const objects = (e.target! as any)._objects;
  const updatedDefects = [...defects];
  const { br, tl } = e.target!.aCoords!;

  if (objects) {
    return updatedDefects; // 不做整组缩放调整
  } else {
    const index = updatedDefects.findIndex((d) => d.id === e.target?.data.id);
    updatedDefects[index].region = `${tl.x / infraredRatio.x} ${
      tl.y / infraredRatio.y
    } ${br.x / infraredRatio.x} ${br.y / infraredRatio.y}`;
    updatedDefects[index].light_region = `${tl.x / lightRatio.x} ${
      tl.y / lightRatio.y
    } ${br.x / lightRatio.x} ${br.y / lightRatio.y}`;
    return updatedDefects;
  }
};

export const groupMove = (
  e: fabric.IEvent,
  infraredRatio: CanvasImageRatio,
  lightRatio: CanvasImageRatio,
  defects: Defect[]
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
      updatedDefects[index].region = `${newTl.x / infraredRatio.x} ${
        newTl.y / infraredRatio.y
      } ${newBr.x / infraredRatio.x} ${newBr.y / infraredRatio.y}`;
      updatedDefects[index].light_region = `${newTl.x / lightRatio.x} ${
        newTl.y / lightRatio.y
      } ${newBr.x / lightRatio.x} ${newBr.y / lightRatio.y}`;
    });
    return updatedDefects;
  } else {
    const index = updatedDefects.findIndex((d) => d.id === e.target?.data.id);
    updatedDefects[index].region = `${tl.x / infraredRatio.x} ${
      tl.y / infraredRatio.y
    } ${br.x / infraredRatio.x} ${br.y / infraredRatio.y}`;
    updatedDefects[index].light_region = `${tl.x / lightRatio.x} ${
      tl.y / lightRatio.y
    } ${br.x / lightRatio.x} ${br.y / lightRatio.y}`;
    return updatedDefects;
  }
};
