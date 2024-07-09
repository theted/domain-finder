import { useEffect, useRef, useState } from "react";
import socketIOClient from "socket.io-client";

const ENDPOINT = "http://127.0.0.1:5000";

type ResultsProps = {
  setIsLoading: (isLoading: boolean) => void;
};

const getFilteredDomains = (domainSuggestions: string) => {
  return domainSuggestions
    .split(" ")
    .map((domain) => domain.split("="))
    .filter((domain) => domain.length === 2)
    .filter((domain) => domain[1] === "true") // available domains
    .map((domain) => [domain[0]])
    .flat()
    .filter((value, index, array) => array.indexOf(value) === index); // unique values
};

const Domain = ({ domain }: { domain: string }) => {
  return (
    <div className="text-black p-3 px-6 rounded-md bg-green-900 text-white hover:bg-green-700 animate-fadein hover:animate-fadein">
      <a href={"https://" + domain} target="_blank" className="">
        {domain}
      </a>
    </div>
  );
};

const Results = ({ setIsLoading }: ResultsProps) => {
  const domainSuggestions = useRef("");
  const [domains, setDomains] = useState([]);

  const filtered = domainSuggestions.current.length
    ? getFilteredDomains(domainSuggestions.current)
    : [];

  console.log({ filtered });

  useEffect(() => {
    const socket = socketIOClient(ENDPOINT);

    socket.on("check-domain", (data) => {
      console.log({ data });
      domainSuggestions.current = `${data.returnvalue.domain}=${data.returnvalue.isAvailable} ${domainSuggestions.current}`;
      setDomains([...domains, data.returnvalue]);
    });

    socket.on("completed", () => {
      setIsLoading(false);
    });
  }, []);

  return (
    <>
      <div className="hidden">{domainSuggestions.current}</div>

      {filtered.length ? (
        <ul className="flex flex-wrap justify-center gap-3 mt-12">
          {filtered.map((domain) => (
            <li key={domain}>
              <Domain key={domain} domain={domain} />
            </li>
          ))}
        </ul>
      ) : (
        ""
      )}
    </>
  );
};

export { Results };
