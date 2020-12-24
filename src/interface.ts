export interface GlobalError {
  statusCode: number;
  message: string;
}

export interface Plant {
  id: number;
  name: string;
  updateTime?: string;
  assets?: Asset[];
}

export interface Asset {
  id: number;
  name: string;
  type: AssetType;
  longitude: number;
  latitude: number;
  assetNo: string;
}

export enum AssetType {
  "drone" = "1",
  "hanger" = "2",
  "standby" = "3",
  "site" = "4"
}

export enum TaskStatus {
  planning = "新航线", // 任务计划中(无航线)
  checking = "未起飞检测", // 状态检测中(确定航线)
  flying = "飞行中", // 飞行执行中
  checkSucceed = "起飞检测成功", // 检测成功
  checkError = "起飞检测失败", // 检测失败
  returning = "返回中", // 无人机返回中(任务结束))
  retreating = "撤回中", // 无人机撤回中(主动/被动)
  failed = "任务失败", // 任务失败
  done = "任务完成" // 任务完成
}

export interface NewTask {
  name: string;
  start_time: string;
  plan_id: number;
  task_type: number;
  skyway_list: number[];
  // # if task_type == 0
  // "skyway_list"?: [1, 2, 3]                  #常规任务， 航线列表
  // # if task_type == 1
  // "skyway_point_list"?: []                   #临时任务， 航点列表
  // # if task_type == 2
  // "skyway_point"?: ""                        #单点任务， 航点
}

export enum TaskType {
  "常规任务",
  "临时任务",
  "单点任务"
}

export type TaskStatusText =
  | "新航线"
  | "起飞失败"
  | "飞行中"
  | "已完成"
  | "提前返航";

export type FlyRoute = string[];

export interface PlanInfo {
  id: number;
  name: string;
  createTime: string;
  projectName: string;
  projectId: number;
}

export type EntityCategory =
  | "label"
  | "point"
  | "line"
  | "connectLine"
  | "hanger"
  | "drone"
  | "standby";

export interface User {
  id: number;
  name: string;
  token: string;
  company: string;
  phone: string;
  user_level: string;
}

export interface WayPoint {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  altitude: number;
  powerGroup?: string; // 代表组串
}

export interface ReportWayPoint extends WayPoint {
  powerGroup: string;
  lightName: string;
  lightUrl: string;
  infraredName: string;
  infraredUrl: string;
  createDate: string;
  updateDate: string;
  defects: Defect[];
}

export interface HangerInfo {
  id: number | null;
  name: string;
  color: string;
  size: [number, number, number]; //x,y,z
  position: [number, number, number];
}

export interface CesiumBoxEntity {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  description: EntityCategory;
}

export interface HangerStatusInfos {
  connection: number;
  isRaining: boolean | undefined;
  windSpeed: number | undefined;
  windDirection: string | undefined;
  humidity: string | undefined;
  temperature: number | undefined;
  flyable: boolean;
}

export interface DroneStatus {
  GPSCount?: number; //卫星颗数
  GPSLevel?: number; //卫星信号强度(max=5)
  STID?: string;
  UAVID?: string;
  altitude?: number; //相对高度,距离起飞点的垂直距离
  azimuth?: number;
  waypointIndex?: number;
  batteries?: any; //电池
  compassState?: number; //指南针状态（0-异常，1-正常）
  distanceStart?: number; //距离起飞点的水平距离
  downLink?: number; //图传信号(max=100)
  gimbalPitch?: number;
  horizontalSpeed?: number; //水平速度
  isGSOnline?: number; //遥控器是否在线 1-在线，0-不在线
  isUAVOnline?: number; //无人机是否在线 1-在线，0-不在线
  latitudeWGS?: number;
  longitudeWGS?: number;
  missionBatch?: string;
  missionID?: string;
  subState?: number;
  timestamp?: string;
  type?: number;
  upLink?: number; //数传信号(遥控器)(max=100)
  verticalSpeed?: number; //垂直速度
  zoom?: number;
}

export interface BatteriesStatus {
  index?: number;
  batteryPercent?: number;
  temperature?: number;
}
export interface PvCesiumPoint {
  altitude: string;
  brief: string;
  color: string;
  count: number;
  create_time: string;
  id: number;
  latitude: string;
  longitude: string;
  name: string;
  position: { x: number; y: number; z: number };
  update_time: string;
}

export interface Defect {
  create_time: string;
  defect_type: number;
  flag: string;
  gps: string;
  homography: string;
  id: number;
  infrared_name: string;
  is_deleted: string;
  light_name: string;
  light_region: string;
  mark: string;
  name: string;
  packet: number;
  point: number;
  project: number;
  region: string;
  update_time: string;
}

export interface ImageInfo {
  brief: string;
  id: number;
  infraredUrl: string;
  infraredName: string;
  lightUrl: string;
  lightName: string;
  projectId: number;
  taskId: number;

  createDate: string;
  updateDate: string;
}

export interface SolarDefect {
  title: string;
  dataIndex: string;
  key: string;
  color: string;
}
export type Coord2d = [number, number];

export interface CanvasImageRatio {
  x: number;
  y: number;
}
