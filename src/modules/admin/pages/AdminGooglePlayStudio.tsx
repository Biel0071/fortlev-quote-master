import React from "react";

export default function AdminGooglePlayStudio() {
  return (
    <div className="w-full h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <iframe
        src="/google-play-studio/index.html"
        title="Google Play Studio & Editor"
        className="w-full h-full border-none"
      />
    </div>
  );
}
