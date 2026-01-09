export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.MOCK_API === "true"
  ) {
    const { server } = await import("./src/mocks/server");
    server.listen({ onUnhandledRequest: "bypass" });
  }
}
