import { ServerConnection } from '@jupyterlab/services';
import { URLExt } from '@jupyterlab/coreutils';

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {},
  param: [string, string] = ['', ''],
  param2: [string, string] = ['', '']
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();

  const requestUrl = URLExt.join(settings.baseUrl, 'climb-onyx-gui', endPoint);

  const url = new URL(requestUrl);
  if (param[0] !== '') {
    url.searchParams.append(param[0], param[1]);
  }
  if (param2[0] !== '') {
    url.searchParams.append(param2[0], param2[1]);
  }

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(
      url.toString(),
      init,
      settings
    );
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

export async function requestAPIResponse(
  endPoint = '',
  init: RequestInit = {},
  param: [string, string] = ['', '']
): Promise<Response> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();

  const requestUrl = URLExt.join(settings.baseUrl, 'climb-onyx-gui', endPoint);

  const url = new URL(requestUrl);
  if (param[0] !== '') {
    url.searchParams.append(param[0], param[1]);
  }

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(
      url.toString(),
      init,
      settings
    );
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }
  return response;
}
