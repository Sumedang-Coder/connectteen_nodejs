const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ConnectTeen API",
      version: "1.0.0",
      description: "API documentation for the ConnectTeen backend services.",
      contact: {
        name: "ConnectTeen Team",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000",
        description: process.env.NODE_ENV === "production" ? "Production server" : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js", "./controllers/*.js"], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
