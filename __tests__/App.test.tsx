import { describe, it, expect } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import App from "../src/App.tsx";

const ROLE = "Graphic Design";
const WORDS = "friendly, fun, creative";

// Note: this is a global integration test utilizing the full API flow of the application.
// Note as it is using several paid APIs, it should be mocked in local tests, but run aginst the actual live APIs in CI.
describe("App", () => {
  it("renders the App component without crashing", () => {
    render(<App />);
  });

  it("handles submit correctly, and shows results", async () => {
    const { getAllByRole, getByRole } = render(<App />);
    const buttons = getAllByRole("button");
    const submitButton = buttons[1];
    const roleDropdown = getByRole("combobox");
    const wordsInput = getByRole("textbox");

    fireEvent.select(roleDropdown, { target: { value: ROLE } });
    expect(roleDropdown).toHaveValue(ROLE);

    fireEvent.change(wordsInput, { target: { value: WORDS } });
    expect(wordsInput).toHaveValue(WORDS);

    fireEvent.click(submitButton);

    await waitFor(() => getAllByRole("link"), { timeout: 10000 });
  });
});
