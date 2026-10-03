import { Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { VideoQuality } from "@/lib/api";
import { cn } from "@/lib/utils";

interface VideoQualitySelectorProps {
  options: VideoQuality[];
  currentQuality: number;
  onQualityChange: (quality: number) => void;
  className?: string;
}

const qualityLabels: Record<number, string> = {
  360: "360p",
  480: "480p",
  540: "540p",
  720: "720p HD",
  1080: "1080p FHD",
};

export function VideoQualitySelector({
  options,
  currentQuality,
  onQualityChange,
  className,
}: VideoQualitySelectorProps) {
  if (options.length <= 1) return null;

  const getQualityLabel = (quality: number) => {
    return qualityLabels[quality] || `${quality}p`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 bg-background/60 backdrop-blur-sm hover:bg-background/80",
            className
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="text-xs font-medium">{getQualityLabel(currentQuality)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuRadioGroup
          value={String(currentQuality)}
          onValueChange={(value) => onQualityChange(Number(value))}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.quality}
              value={String(option.quality)}
              className="cursor-pointer"
            >
              {getQualityLabel(option.quality)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
