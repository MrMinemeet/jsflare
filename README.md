# JSflare - A Dynamic DNS client using Cloudflare
![GitHub License](https://img.shields.io/github/license/mrminemeet/jsflare)
![GitHub Tag](https://img.shields.io/github/v/tag/mrminemeet/jsflare)

JSflare is a simple command-line tool that keeps your Cloudflare DNS records updated with your current public IP address. Ideal for users with dynamic IPs who want to host services at home, it supports both Cloudflare API keys and tokens for secure authentication. Configure it easily with a JSON file and let it handle the rest.

## How does this work?
Cloudflare hosts your DNS records (besidees a bunch of other things). This script will update your DNS record with your current public IP address. This is useful if you have a dynamic IP address and want to host a server at home.

## Usage guide
The script is intended to be directly called from the command line - although you could import it as a module if you wanted to.

The script requires a configuration file `config.jsonc` or `config.json` to be present. Take the provided [example_config.jsonc](example_config.jsonc) as an example and fill in the required fields.

To run the script with Node.js you have to install the dependencies and transpile the code first.
This can be done with the following commands. (The repository uses [pnpm](https://pnpm.io/) as package manager, but you can use `npm` as well.)
```bash
pnpm install
pnpm run build
```

The actual script is then found in the `dist` directory and can be run with:
```bash
node dist/index.js
```

## Configuration file
The configuration file is a JSON file that contains the necessary information to update the DNS records. The
required fields are:

- `maxRetries` (number): How many retries to attempt before giving up. Must be >= 0.
- `timeout` (number): Seconds to wait before retrying after a failed update. Must be >= 0.
- `items` (array): List of DNS records to update. Each item supports:
	- `token` (string, optional): Cloudflare API token for the zone (preferred).
	- `email` (string, optional): Cloudflare account email (legacy key auth).
	- `key` (string, optional): Cloudflare API key (legacy key auth).
	- `zone` (string): The zone name (e.g., `domain.example`).
	- `record` (string): The full DNS record name to update (e.g., `host.domain.example`).
	- `ttl` (number): TTL in seconds. `1` means automatic. Valid range is 60-86400.
	- `proxied` (boolean): Whether the record is proxied through Cloudflare.
- `postUpdateWebhook` (string, optional): URL to POST to after each update attempt, with the results.

Notes:
- Provide either `token` or `email` + `key` for each item.
- `items` can contain a mix of token and legacy key entries.

### Webhook data
If `postUpdateWebhook` is set, the script will send a POST request to the specified URL.
This update is triggered on each run, so even when nothing was updated. The idea is to allow users to see if the script is actually running (e.g. health checks).  
The payload will be a JSON object with the following structure:
```jsonc
{
	"timestamp": "2026-01-01T00:00:00.000Z", // ISO string of the time the update was attempted
	"publicIp": "1.2.3.4", // The public IP address that was detected
	"records": [
		{
			"record": "host1.domain.example", // The record that was updated,
			"success": true, // Whether the update was successful
			// No "error" when update was successful
		},
		{
			"record": "host2.domain.example", // The record that was updated,
			"success": false, // Whether the update was successful
			"error": "Failed to update record" // If the update failed, this will contain the error message
		}
	]
}

```

## API access & permissions
The script can work with either the legacy API keys or the new API tokens.
The prefered way are the tokens, which are more secure and can be more granularly controlled, and in general limit actions to the required minimum.

Independent of the used method, the key/token can be viewed/generated in the [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens).

### Legacy API keys
To use the legacy API keys, you need to provide the `email` and `key` fields in the configuration file. This method does **not** provide any restrictions on the actions that can be taken with the API key. So it is recommended to use the API tokens.

### API tokens
To use the API tokens, you need to provide `token` fields in the configuration file. The token can be generated in the dashboard.
The token needs the following permission:
- All zones - **Zone:Read, DNS:Edit**

## Periodic updates using Systemd
To run the script periodically, you can use a systemd timer and service. There are other ways to run the script periodically, but this is the most common way on most Linux systems.

### jsflare.timer
To call the script every *N* minutes, create a file `/etc/systemd/system/jsflare.timer` with the following content:
```ini
[Unit]
Description=Run JSflare DNS update service

[Timer]
# Run every 10 minutes
OnCalendar=*:0/10
Persistent=true

[Install]
WantedBy=timers.target
```

### jsflare.service
The service that actually runs the script should be created in `/etc/systemd/system/jsflare.service`.
The value of `WorkingDirectory` should be the path to the repository was cloned to.
```ini
[Unit]
Description=JSflare DNS Update Service
After=network.target

[Service]
Type=simple
WorkingDirectory=<SET THIS VALUE>
ExecStart=/usr/bin/node ./dist/index.js

[Install]
WantedBy=multi-user.target
```

---

## Dependencies
* [ipify](https://www.ipify.org/) is used to get the public IP address.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
