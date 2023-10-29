export async function handler(event: any, context: any) {
  // TODO implement
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "all users!",
      input: event,
    }),
  };
}
