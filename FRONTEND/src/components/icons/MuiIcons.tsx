import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { SxProps, Theme } from "@mui/material/styles";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import AutoFixHighRounded from "@mui/icons-material/AutoFixHighRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ExploreRounded from "@mui/icons-material/ExploreRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import TrackChangesRounded from "@mui/icons-material/TrackChangesRounded";
import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import FolderCopyRounded from "@mui/icons-material/FolderCopyRounded";
import WorkOutlineRounded from "@mui/icons-material/WorkOutlineRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import LanguageRounded from "@mui/icons-material/LanguageRounded";
import PhotoCameraRounded from "@mui/icons-material/PhotoCameraRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import ZoomInRounded from "@mui/icons-material/ZoomInRounded";
import DensitySmallRounded from '@mui/icons-material/DensitySmallRounded';
import DensityLargeRounded from '@mui/icons-material/DensityLargeRounded';
import ZoomOutRounded from "@mui/icons-material/ZoomOutRounded";
import FullscreenRounded from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRounded from "@mui/icons-material/FullscreenExitRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import DashboardCustomizeRounded from "@mui/icons-material/DashboardCustomizeRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import UploadRounded from "@mui/icons-material/UploadRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import GppBadRounded from "@mui/icons-material/GppBadRounded";
import ContactPageRounded from "@mui/icons-material/ContactPageRounded";
import BusinessCenterRounded from "@mui/icons-material/BusinessCenterRounded";
import RadarRounded from "@mui/icons-material/RadarRounded";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";

export interface MuiIconProps extends Omit<SvgIconProps, "color"> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

const compatible = (
  Icon: ComponentType<SvgIconProps>,
  mirrorInRtl = false,
) => {
  const CompatibleIcon = ({ size, color, strokeWidth: _strokeWidth, sx, ...props }: MuiIconProps) => {
    const base = {
      fontSize: size,
      color,
      transform: mirrorInRtl && typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "scaleX(-1)" : undefined,
    };
    const merged = [base, ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean) as SxProps<Theme>;
    return <Icon {...props} sx={merged} />;
  };
  return CompatibleIcon;
};

export const Plus = compatible(AddRounded);
export const Pencil = compatible(EditRounded);
export const Trash2 = compatible(DeleteOutlineRounded);
export const FileText = compatible(DescriptionRounded);
export const Wand2 = compatible(AutoFixHighRounded);
export const ExternalLink = compatible(OpenInNewRounded);
export const ArrowUpRight = compatible(OpenInNewRounded);
export const CheckCircle2 = compatible(CheckCircleOutlineRounded);
export const Compass = compatible(ExploreRounded);
export const SearchCheck = compatible(FactCheckRounded);
export const Sparkles = compatible(AutoAwesomeRounded);
export const Target = compatible(TrackChangesRounded);
export const Star = compatible(StarOutlineRounded);
export const User = compatible(PersonRounded);
export const Files = compatible(FolderCopyRounded);
export const Briefcase = compatible(WorkOutlineRounded);
export const Settings = compatible(SettingsRounded);
export const LogOut = compatible(LogoutRounded);
export const Globe = compatible(LanguageRounded);
export const Camera = compatible(PhotoCameraRounded);
export const Check = compatible(CheckRounded);
export const RefreshCw = compatible(RefreshRounded);
export const Clock = compatible(ScheduleRounded);
export const Home = compatible(HomeRounded);
export const ZoomIn = compatible(ZoomInRounded);
export const DensityTight = compatible(DensitySmallRounded);
export const DensityLoose = compatible(DensityLargeRounded);
export const ZoomOut = compatible(ZoomOutRounded);
export const Maximize = compatible(FullscreenRounded);
export const Minimize = compatible(FullscreenExitRounded);
export const ArrowLeft = compatible(ArrowBackRounded, true);
export const ArrowRight = compatible(ArrowForwardRounded, true);
export const Download = compatible(DownloadRounded);
export const LayoutTemplate = compatible(DashboardCustomizeRounded);
export const Save = compatible(SaveRounded);
export const Upload = compatible(UploadRounded);
export const BarChart3 = compatible(BarChartRounded);
export const FileUp = compatible(UploadFileRounded);
export const Award = compatible(EmojiEventsRounded);
export const ShieldAlert = compatible(GppBadRounded);
export const FileUser = compatible(ContactPageRounded);
export const BriefcaseBusiness = compatible(BusinessCenterRounded);
export const Radar = compatible(RadarRounded);
export const UploadCloud = compatible(CloudUploadRounded);
export const Search = compatible(SearchRounded);
export const Building2 = compatible(BusinessRounded);
export const Undo = compatible(UndoRounded);
export const Redo = compatible(RedoRounded);
