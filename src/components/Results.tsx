import { useState, useEffect, useRef } from "react";
import socketIOClient from "socket.io-client";

const ENDPOINT = "http://127.0.0.1:5000";

const Results = () => {
  const domainSuggestions = useRef("");

  const filtered = domainSuggestions.current.length
    ? domainSuggestions.current
        .split(" ")
        .map((domain) => domain.split("="))
        .filter((domain) => domain.length === 2)
        .filter((domain) => domain[1] === "true") // available domains
        .map((domain) => [domain[0]])
        .flat()
        .filter((value, index, array) => array.indexOf(value) === index) // unique values
    : [];

  console.log({ filtered });

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT);

    socket.on("check-domain", (data) => {
      domainSuggestions.current = `${data.returnvalue.domain}=${data.returnvalue.isAvailable} ${domainSuggestions.current}`;
    });
  }, []);

  return (
    <>
      <div className="hidden">{domainSuggestions.current}</div>

      <div id="suggestions" className="mt-12">
        {filtered.length && (
          <ul className="flex flex-wrap justify-center gap-3">
            {filtered.map((domain) => (
              <li
                key={domain}
                className="text-black p-3 border border-black font-bold"
              >
                <a href={"https://" + domain} target="_blank" className="">
                  {domain}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export { Results };
