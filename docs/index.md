---
hide:
  - navigation
---

# JupyterLab Extension for Onyx

## Introduction

This site documents [Onyx-extension](https://github.com/CLIMB-TRE/onyx-extension), an extension to [JupyterLab](https://jupyterlab.readthedocs.io/en/stable/index.html) that provides:

- :material-set-center:{ .pink }: Access to the [Onyx GUI](https://github.com/CLIMB-TRE/onyx-gui), a graphical user interface for interacting with the [Onyx](https://github.com/CLIMB-TRE/onyx/) database.
- :material-file-plus:{ .pink }: An S3 download utility.
- :material-dna:{ .pink }: Links to the [CLIMB-TRE documentation](https://climb-tre.github.io/).

Onyx is being developed as part of the [CLIMB-TRE](https://climb-tre.github.io/) project.

![Onyx Records in JupyterLab](img/record_list.png)

## Installation

!!! info "Usage within CLIMB JupyterLab Servers"
    If you are running a CLIMB JupyterLab server, you **do not** need to install the extension, as it comes pre-configured in your environment.

    If you cannot see the most up-to-date version of the Onyx JupyterLab extension, this is because you will have previously installed your own version manually.

    To revert your Onyx JupyterLab extension to the managed up-to-date version, navigate to your terminal and run:

    ```
    $ pip uninstall climb-onyx-gui
    ```

    And restart your JupyterLab server.

### Install from PyPI

```
$ pip install climb-onyx-gui
```

This installs the latest version of the Onyx-extension from [PyPI](https://pypi.org/project/climb-onyx-gui/).

### Build from source

Clone the source code from GitHub:

```
$ git clone https://github.com/CLIMB-TRE/onyx-extension.git
```

Ensure you have Miniconda (or an alternative conda installer) available. Installation instructions can be found [here](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html).

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

You can now run JupyterLab with:

```
$ jupyter lab
```

And the Onyx extension will be ready on the launcher.

The extension code and its dependencies can be modified and rebuilt by executing:

```
$ jlpm install && jlpm run build && pip install -ve .
```
