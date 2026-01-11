"use client"; // This is a client component 👈🏽
import React from 'react';
import { ZeroPole } from './components/AppFrame/ZeroPole/ZeroPole';
import { FIRFilterDesign } from './components/AppFrame/FIRFilterDesign/FIRFilterDesign';
import { IIRFilterDesign } from './components/AppFrame/IIRFilterDesign/IIRFilterDesign';
import { LeastSqaureLinearPhaseFIRDesign } from './components/AppFrame/LeastSquareLinearPhaseFIRDesign/LeastSqaureLinearPhaseFIRDesign';
import { Periodogram } from './components/AppFrame/Periodogram/Periodogram';
import { Prompt } from './components/AppFrame/Prompt/Prompt';
import { WelchsEstimate } from './components/AppFrame/WelchsEstimate/WelchsEstimate';
import { Simulation } from './components/AppFrame/Simulation/Simulation';

export default function Home() {
  const items = [
    { placeholder: "Filter Design", name: "title_filter_design" },
    { placeholder: "Zero-pole placement", name: "zero_pole" },
    { placeholder: "Windowing method", name: "fir_filter_design" },
    { placeholder: "Analog-to-digital transform", name: "iir_filter_design" },
    { placeholder: "Linear phase FIR-LS", name: "least_square_linear_phase_FIR" },
    { placeholder: "separator", name: "seperator" },

    { placeholder: "Hybrid Simulation", name: "sensor_fusion_simulation" },
    { placeholder: "bottom_elements", name: "bottom_elements" },
    { placeholder: "separator", name: "seperator" },
    { placeholder: "Periodogram estimation", name: "periodogram" },
    { placeholder: "Welch's method", name: "welchs_estimate" },
    { placeholder: "separator2", name: "seperator" },
    { placeholder: "> Interactive Prompt", name: "prompt" },
    { placeholder: "Help?", name: "help" }
  ];

  const [selectedItem, setSelectedItem] = React.useState(items[1]);

  const addComponent = () => {
    switch (selectedItem.name) {
      case "zero_pole":
        return <ZeroPole />;
      case "fir_filter_design":
        return <FIRFilterDesign />;
      case "iir_filter_design":
        return <IIRFilterDesign />;
      case "least_square_linear_phase_FIR":
        return <LeastSqaureLinearPhaseFIRDesign />;
      case "periodogram":
        return <Periodogram />
      case "welchs_estimate":
        return <WelchsEstimate />
      case "sensor_fusion_simulation":
        return <Simulation />
      case "prompt":
        return <Prompt />;
      case "help":
        return (
          <div className="text-black rounded-lg shadow w-full p-5">
            <br></br>
            <p>
              AvaDSP is an opensource web app for designing and visualizing digital filters, estimating power spectral density and more.
              Features include designing filters by placing poles and zeroes on the Z-plane, FIR filter design using windowing method, IIR filter design using analog-to-digital transfomation, and lastly, linear phase FIR design via weighted least-squares solution.
            </p>
            <p>
              For additional information visit: <a className="text-blue-600" href="https://github.com/AvaDSP">https://github.com/AvaDSP</a></p>
            <br></br>
            <p>Version: 0.3</p>
          </div >
        )
    }
  }

  return (
    <div className="relative flex h-screen z-20">
      {/* Sidebar */}
      <aside className="fixed flex flex-col px-5 py-4 border-r border-slate-200 z-30 bg-white h-full">
        {items.map((item, index) => {
          if (item.name.match("title.*")) {
            return (
              <h1
                key={`prompt-${item.name}-${index}`}
                className={`flex text-bold h-10 p-2 text-sm w-48 
                  ${selectedItem.name === item.name ? "bg-white hover:bg-gray-50 shadow" : ""}`}
              >
                <p className="font-bold">{item.placeholder}</p>
              </h1>
            );
          } else if (item.name === "prompt") {
            return (
              <button
                key={`prompt-${item.name}-${index}`}
                className={`flex h-10 p-2 text-sm rounded w-48 
                  ${selectedItem.name === item.name ? "bg-white hover:bg-gray-50 shadow" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <p className="font-bold">{item.placeholder}</p>
              </button>
            );
          } else if (item.name === "seperator") {
            return (
              <div
                key={`seperator-${item.name}-${index}`}
                className="h-px bg-gray-300 my-2 w-full"
              ></div>
            );
          } else if (item.name === "bottom_elements") {
            return (
              <div key={`seperator-${item.name}-${index}`} className="mt-auto"></div>
            )
          } else {
            return (
              <button
                key={`item-${item.name}-${index}`}
                className={`flex h-10 p-2 text-sm rounded
                ${selectedItem.name === item.name ? "bg-white hover:bg-gray-50 shadow" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <p>{item.placeholder}</p>
              </button>
            );
          }
        })}

      </aside>
      {/* Main app */}
      <main className="absolute left-[230px] w-[calc(100vw-230px)] h-full overflow-y-auto flex z-10">
        {addComponent()}
      </main>
    </div>
  )
}
