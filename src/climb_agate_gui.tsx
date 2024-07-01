import React from "react";

interface AgateProps {
    httpPathHandler: (path: string) => Promise<Response>;
    s3PathHandler?: (path: string) => void;
    fileWriter?: (path: string, content: string) => void;
    extVersion?: string;
  }

  
function Agate(props: AgateProps) {
    return <h1>Version:, {props.extVersion}!</h1>;
  }
  
  export default Agate;