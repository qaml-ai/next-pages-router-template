// Database logos
import bigqueryLogo from './bigquery-logo.png';
import clickhouseLogo from './clickhouse-logo.png';
import googleSheetsLogo from './google_sheets-logo.png';
import metabaseLogo from './metabase-logo.png';
import mixpanelLogo from './mixpanel-logo.png';
import mongodbLogo from './mongodb-logo.png';
import motherduckLogo from './motherduck-logo.png';
import mssqlLogo from './mssql-logo.png';
import mysqlLogo from './mysql-logo.png';
import postgresLogo from './postgres-logo.png';
import singlestoreLogo from './singlestore-logo.png';
import snowflakeLogo from './snowflake-logo.png';
import sqlServerLogo from './sql server-logo.png';
import sqliteLogo from './sqlite-logo.png';
import supabaseLogo from './supabase-logo.png';

// Create a mapping object for dynamic access
export const databaseLogos = {
  'bigquery': bigqueryLogo,
  'clickhouse': clickhouseLogo,
  'google_sheets': googleSheetsLogo,
  'google sheets': googleSheetsLogo,
  'metabase': metabaseLogo,
  'mixpanel': mixpanelLogo,
  'mongodb': mongodbLogo,
  'motherduck': motherduckLogo,
  'mssql': mssqlLogo,
  'mysql': mysqlLogo,
  'postgres': postgresLogo,
  'postgresql': postgresLogo,
  'singlestore': singlestoreLogo,
  'snowflake': snowflakeLogo,
  'sql server': sqlServerLogo,
  'sqlite': sqliteLogo,
  'supabase': supabaseLogo,
};

// Helper function to get logo by name
export const getDatabaseLogo = (name) => {
  if (!name) return null;
  const normalizedName = name.toLowerCase().trim();
  const logoObject = databaseLogos[normalizedName];
  return logoObject ? logoObject.src : null;
};

// Export individual logos for direct import if needed
export {
  bigqueryLogo,
  clickhouseLogo,
  googleSheetsLogo,
  metabaseLogo,
  mixpanelLogo,
  mongodbLogo,
  motherduckLogo,
  mssqlLogo,
  mysqlLogo,
  postgresLogo,
  singlestoreLogo,
  snowflakeLogo,
  sqlServerLogo,
  sqliteLogo,
  supabaseLogo,
}; 