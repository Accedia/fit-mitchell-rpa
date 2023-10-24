import React from "react";
import { Icon, Popup } from "semantic-ui-react";

interface SectionTitleProps {
  title: string;
  popup: boolean;
  popupPosition?:
    | "left center"
    | "top left"
    | "top right"
    | "bottom right"
    | "bottom left"
    | "right center"
    | "top center"
    | "bottom center"
    | undefined;
  popupContent?: string;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  popup,
  popupContent,
  popupPosition = "top center",
  className,
}) => {
  return (
    <h4>
      {title}
      {popup && (
        <Popup
          className={className}
          inverted
          position={popupPosition}
          content={popupContent}
          trigger={<Icon name="question circle" />}
        />
      )}
    </h4>
  );
};

export default SectionTitle;
