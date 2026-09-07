import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Receiver from "./pages/Receiver";
import Transmit from "./pages/Transmit";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/transmitir" element={<Transmit />} />
      <Route path="/r/:code" element={<Receiver />} />
      <Route path="/receiver" element={<Receiver />} />
    </Routes>
  );
}
