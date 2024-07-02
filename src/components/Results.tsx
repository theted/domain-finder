import { useState, useEffect, useRef } from "react";
import socketIOClient from "socket.io-client";

const ENDPOINT = "http://127.0.0.1:5000";

const Results = () => {
  const stuff = useRef("");
  const [response] = useState("");
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT);

    socket.on("check-domain", (data) => {
      setDomains([
        {
          domain: data.returnvalue.domain,
          isAvailable: data.returnvalue.isAvailable,
        },
        ...domains,
      ]);

      stuff.current = stuff.current + " " + data.returnvalue.domain;
    });
  }, []);

  return (
    <>
      {domains && (
        <>
          <div>
            <p className="text-black">{stuff.current}</p>
          </div>
          <ul>
            {domains.map((domain) => (
              <li key={domain.domain} className="text-black">
                {domain.domain} -{" "}
                {domain.isAvailable ? "available" : "reserved"}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-black">{response ? response : ""}</p>
    </>
  );
};

export { Results };
