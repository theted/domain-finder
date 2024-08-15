export const ENVIRONMENT = process.env.NODE_ENV || "development";

export const QUQUE_OPTIONS = {
  connection: {
    host: ENVIRONMENT === "development" ? "localhost" : "redis",
    port: 6379,
  },
};
