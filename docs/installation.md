# Installation

Guidance for installing the Onyx JupyterLab extension, or building it manually for development.

!!! info "Usage within CLIMB JupyterLab Servers"
    If you are running a CLIMB JupyterLab server, you **do not** need to install the extension, as it comes pre-configured in your environment.

    If you cannot see the most up-to-date version of the Onyx JupyterLab extension, this is because you will have previously installed your own version manually.

    To revert your Onyx JupyterLab extension to the managed up-to-date version, navigate to your terminal and run:

    ```
    $ pip uninstall climb-onyx-gui
    ```

    And restart your JupyterLab server.

## Install from [PyPI](https://pypi.org/project/climb-onyx-gui/)

Assuming you have JupyterLab installed:

```
$ pip install climb-onyx-gui
```

Otherwise:

```
$ pip install "jupyterlab>=3" climb-onyx-gui
```

## Build from source

Clone the repository:

```
$ git clone https://github.com/CLIMB-TRE/onyx-extension.git
$ cd onyx-extension/
```

Ensure you have Miniconda (or an alternative conda installer) available. Installation instructions for Conda can be found [here](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html).

Create and activate a conda environment with JupyterLab and NodeJS:

```
$ conda create -n jupyterlab-ext -c conda-forge jupyterlab=4 nodejs=20
$ conda activate jupyterlab-ext
```

Install the extension dependencies with the JupyterLab package manager `jlpm`:

```
$ jlpm install
```

Build the extension and install it:

```
$ jlpm run build
$ pip install -ve .
```

Optionally, copy and edit `.env.example` with `ONYX_DOMAIN` and `ONYX_TOKEN` for your development instance of Onyx:

```
$ cp .env.example .env
$ source .env # After editing
```

You can now launch JupyterLab with:

```
$ jupyter lab
```

And the Onyx extension will be ready on the launcher.

## Local development

If you wish to develop the extension, ensure you have followed the above steps to build, install and run the extension from source.

From there, you can simply modify the extension code and dependencies, and reinstall/rebuild the extension by executing:

```
$ jlpm install && jlpm run build && pip install -ve .
```

and then relaunching JupyterLab.

## Troubleshooting

If you are seeing the frontend extension, but it is not working, check that the server extension is enabled with:

```
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing the frontend extension, check the frontend extension is installed with:

```
jupyter labextension list
```
