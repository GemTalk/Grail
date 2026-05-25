# CI base image for Grail.
#
# Layers Python 3.14 + a C toolchain on top of the QA Ubuntu 22.04 image, so
# the `test:` job in .gitlab-ci.yml doesn't have to re-run those apt steps on
# every pipeline.  Built by the manual `build-ci-image` job and published to
# this project's container registry.

ARG QA_UBUNTU_TAG=22.04
FROM container.gemtalksystems.com/gemstone/containers/qa/ubuntu:${QA_UBUNTU_TAG}

# Grail needs make/cc to build the CPython shim, and Python >= 3.14 for the
# embedded-CPython FFI (PyInitConfig from PEP 741).
RUN sudo apt-get update \
 && sudo apt-get install -y --no-install-recommends \
        build-essential \
        software-properties-common \
        gnupg \
 && sudo add-apt-repository -y ppa:deadsnakes/ppa \
 && sudo apt-get install -y --no-install-recommends \
        python3.14 \
        python3.14-dev \
 && sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.14 1 \
 && sudo update-alternatives --install /usr/bin/python3-config python3-config /usr/bin/python3.14-config 1 \
 && sudo rm -rf /var/lib/apt/lists/*
