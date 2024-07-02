import { Form } from "./components/Form";
import { Results } from "./components/Results";

const App = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="p-6 border rounded-lg bg-white max-w-xl">
        <h1 className="text-3xl font-bold text-black">Domain finder</h1>
        <Form />
        <Results />
      </div>
    </div>
  );
};

export default App;
