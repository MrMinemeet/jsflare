# JSflare - A Dynamic DNS client using Cloudflare
JSflare is a simple command-line tool that keeps your Cloudflare DNS records updated with your current public IP address. Ideal for users with dynamic IPs who want to host services at home, it supports both Cloudflare API keys and tokens for secure authentication. Configure it easily with a JSON file and let it handle the rest.

## How does this work?
Cloudflare hosts your DNS records (besidees a bunch of other things). This script will update your DNS record with your current public IP address. This is useful if you have a dynamic IP address and want to host a server at home.

## Usage guide
The script is intended to be directly called from the command line - although you could import it as a module if you wanted to.

The script requires a configuration file `config.jsonc` or `config.json` to be present. Take the provided [example_config.jsonc](example_config.jsonc) as an example and fill in the required fields. 

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

---

## Dependencies
* [axios](https://www.npmjs.com/package/axios) is used for making HTTP requests.
* [ipify](https://www.ipify.org/) is used to get the public IP address.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
