const { Client } = require('pg');
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  console.log("Evento recibido: ", JSON.stringify(event));

  const secretsmanager = new AWS.SecretsManager();
  const userSecretArn = process.env.USER_SECRET_ARN;
  const rdsSecretArn = process.env.RDS_SECRET_ARN;

  try {
    // Obtener las credenciales del Secret Manager
    const rdsSecret = await secretsmanager.getSecretValue({ SecretId: rdsSecretArn }).promise();
    const userSecret = await secretsmanager.getSecretValue({ SecretId: userSecretArn }).promise();

    const rdsCredentials = JSON.parse(rdsSecret.SecretString);
    const userCredentials = JSON.parse(userSecret.SecretString);

    const client = new Client({
      host: rdsCredentials.host,
      port: rdsCredentials.port,
      user: rdsCredentials.username,
      password: rdsCredentials.password,
      database: 'postgres'
    });

    await client.connect();
    console.log("Conectado a la base de datos");

    // Crear la base de datos y el usuario
    const createDbQuery = `CREATE DATABASE foods;`;
    const createUserQuery = `CREATE USER ${userCredentials.username} WITH PASSWORD '${userCredentials.password}';`;
    const grantPrivilegesQuery = `GRANT ALL PRIVILEGES ON DATABASE foods TO ${userCredentials.username};`;

    await client.query(createDbQuery);
    console.log("Base de datos 'foods' creada.");
    await client.query(createUserQuery);
    console.log(`Usuario '${userCredentials.username}' creado.`);
    await client.query(grantPrivilegesQuery);
    console.log(`Privilegios otorgados al usuario '${userCredentials.username}'.`);

    await client.end();
    console.log("Conexión a la base de datos cerrada.");

    return {
      statusCode: 200,
      body: JSON.stringify('Success!')
    };

  } catch (error) {
    console.error("Error en la función Lambda: ", error);
    throw error;
  }
};