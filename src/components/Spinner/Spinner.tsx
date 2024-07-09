import SpinnerImage from "./Spinner.svg";
import "./Spinner.css";

export const Spinner = () => (
  <img
    src={SpinnerImage}
    className="spinner bg-white p-8"
    style={{
      minWidth: "120px",
      fill: "white",
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      boxShadow: "10px 10px 20px rgba(0,0,0,0.4)",
    }}
  />
);
