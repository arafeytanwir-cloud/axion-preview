import type { ImageMetadata } from "astro";

// Hero images — curated photos per service
import heroDesignEngineering from "../assets/photos/services/design-engineering/design-engineering.jpeg";
import heroEtap from "../assets/photos/services/etap-network-study/etap-network-study-banner.jpeg";
import heroSubstation from "../assets/photos/services/substation-automation/substation-automation.jpg";
import heroDataCenter from "../assets/photos/services/data-center-it/datacenter.jpeg";
import heroSoftware from "../assets/photos/services/software-services/software-services.jpeg";
import heroSurveillance from "../assets/photos/services/video-surveillance/banner.jpeg";
import bmsArchitecture from "../assets/photos/services/video-surveillance/bms-architecture.jpeg";
import surveillanceCams from "../assets/photos/services/video-surveillance/video-surveillance.webp";
import heroCivilWorks from "../assets/photos/services/civil-works-landscaping/civil-works-landscaping.jpeg";
import heroSpecialised from "../assets/photos/services/specialised-services/specialised-services.png";
import outdoorSpaces from "../assets/photos/services/civil-works-landscaping/outdoor-spaces.jpeg";
import civilDesignConstruction from "../assets/photos/services/civil-works-landscaping/civil-design-and-construction.jpeg";

// ETAP section images — curated per sub-topic
import etapLoadFlow from "../assets/photos/services/etap-network-study/load-flow-analysis.jpeg";
import etapShortCircuit from "../assets/photos/services/etap-network-study/short-circuit-analysis.jpeg";
import etapArcFlash from "../assets/photos/services/etap-network-study/arch-flash.jpeg";
import etapProtection from "../assets/photos/services/etap-network-study/protection-coordination.jpeg";
import etapHarmonics from "../assets/photos/services/etap-network-study/harmonic-analysis.png";

export const heroImages: Record<string, ImageMetadata> = {
  "design-engineering": heroDesignEngineering,
  "etap-network-study": heroEtap,
  "substation-automation": heroSubstation,
  "data-center-it": heroDataCenter,
  "software-services": heroSoftware,
  "video-surveillance": heroSurveillance,
  "civil-works-landscaping": heroCivilWorks,
  "specialised-services": heroSpecialised,
};

// Section images for ETAP study page
export const sectionImages: Record<string, Record<string, ImageMetadata>> = {
  "etap-network-study": {
    "load-flow": etapLoadFlow,
    "short-circuit": etapShortCircuit,
    "arc-flash": etapArcFlash,
    "protection-coordination": etapProtection,
    "harmonics": etapHarmonics,
  },
  "video-surveillance": {
    "bms": bmsArchitecture,
    "surveillance": surveillanceCams,
  },
  "civil-works-landscaping": {
    "outdoor-spaces": outdoorSpaces,
    "structural-civil-engineering": civilDesignConstruction,
  },
};
