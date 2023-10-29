export async function handler(event: any, context: any) {
  const userId = {
    id: event.pathParameters.id,
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `get userId: ${userId.id}!`,
    }),
  };
}
