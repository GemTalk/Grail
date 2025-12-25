# Grail

Run [Python](https://docs.python.org/3/reference/index.html) on GemStone/S 64 Bit.

## Installation

### Python 3

Install the following:

  * [Python](https://www.python.org/downloads/). When you enter `python3 --version` it should show you 3.14.0 or later. 
  * [pip](https://docs.python.org/3/installing/index.html) is used to install Python packages. When you enter `pip --version` it should show you 25.3 or later.
  * [pprintast](https://pypi.org/project/pprintast/) is used to parse Python source files. When you enter `pprintast --version` it should show you 1.2.1 or later.

### Git Checkout

Checkout this Git project to `$HOME/code/GemStone/Grail` (or to some other place and be prepared to edit things to match your path).

### GemStone/S

[GemStone/S](https://gemtalksystems.com/products/gs64/) can be most easily run on macOS using the free, open source [GemStone.app](https://github.com/jgfoster/GemStoneApp). From the Setup tab, click `Authenticate` and give your password (as an administrator) to allow the helper tool to be installed. Then, from the Versions tab, click `Update` to get a list of available GemStone versions. Check the box for a recent version (3.7.4.3 at the time of this writing) to download that version. Then, from the Databases tab, click the `+` button to create a new database and click `Start` to start the database.

Copy the provided `topazini` to `~/.topazini` and edit `gs64stone` to show the name of your database if different. Copy the provided `setenv` to `.setenv` and edit the path to point to your GemStone install. Then open a terminal in this directory and run `./install.sh`. If this finishes without errors then you may proceed to the next step.

## Tests

To run the test suite, run the following:

```
. ./setenv
topaz -lq <<EOF
login
run
PythonTestCase suite run printString
%
logout
EOF
```

## Running Python Code in Grail

### Hello World
Our first task is a "Hello World!" program (`scripts/hello.py`). From a command line execute:

```
./grail scripts/hello.py
```

### REPL

A REPL (read-eval-print loop) is a convenient way to experiment with a programming language. To run the Grail REPL, execute:

```
./grail
```

To exit the REPL, enter `exit()` or `quit()`. If you get an error and end up with a `topaz 1>` prompt, then enter `exit` to exit.

## Other documentation

* [Programs](docs/Programs.md) that we could use to test our work.
* [Development](docs/Development.md) process and notes.
