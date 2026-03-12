const checkApiButton = document.getElementById("check-api");
const output = document.getElementById("api-output");

if (checkApiButton && output) {
  checkApiButton.addEventListener("click", async () => {
    output.textContent = "Loading...";

    try {
      const response = await fetch("/api/teachers", {
        headers: {
          Authorization: "Bearer demo-token",
        },
      });
      const data = await response.json();
      output.textContent = JSON.stringify(
        {
          status: response.status,
          data,
        },
        null,
        2
      );
    } catch (error) {
      output.textContent = `Request failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  });
}
