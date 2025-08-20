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

## Install from PyPI

```
$ pip install climb-onyx-gui
```

This installs the latest version of the extension from [PyPI](https://pypi.org/project/climb-onyx-gui/).

## Build from source

Clone the source code from GitHub:

```
$ git clone https://github.com/CLIMB-TRE/onyx-extension.git
```

Ensure you have Miniconda (or an alternative conda installer) available. Installation instructions for Conda can be found [here](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html).

Create and activate a conda environment with JupyterLab and NodeJS:

```
$ conda create -n jupyterlab-ext -c conda-forge jupyterlab=4 nodejs=20
$ conda activate jupyterlab-ext
```

Navigate to the extension directory, and install the extension dependencies with the JupyterLab package manager `jlpm`:

```
$ cd onyx-extension/
$ jlpm install
```

Build and install the extension:

```
$ jlpm run build
$ pip install -ve .
```

You can now launch JupyterLab with:

```
$ jupyter lab
```

And the Onyx extension will be ready on the launcher.

### Developing the Extension

If you wish to develop on the extension, ensure you have followed the above steps to build, install and run the extension.

From there, you can simply modify the extension code and dependencies, and reinstall/rebuild the extension by executing:

```
$ jlpm install && jlpm run build && pip install -ve .
```
