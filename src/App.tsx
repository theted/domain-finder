import { Form } from "./components/Form";
import { Results } from "./components/Results";
import { Spinner } from "./components/Spinner/Spinner";
import { useState } from "react";

const App = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="p-6 border rounded-lg bg-white max-w-screen-lg">
        <h1 className="text-3xl font-bold text-black">Domain finder</h1>
        <Form setIsLoading={setIsLoading} />
        <Results setIsLoading={setIsLoading} />
      </div>

      {isLoading && <Spinner />}
    </div>
  );
};

export default App;
