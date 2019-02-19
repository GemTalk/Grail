# GemStone/P

Run Python on GemStone/S 64 Bit

## macOS Installation

### Git Checkout

Checkout this Git project to `$HOME/code/Python/GemStoneP` (or to some other place and be prepared to edit things to match your path).

### GemStone/S

[GemStone/S](https://gemtalksystems.com/products/gs64/) can be most easily run on macOS using the free, open source [GemStone.app](https://github.com/jgfoster/GemStoneApp). From the Setup tab, click `Authenticate` and give your password (as an administrator) to allow the helper tool to be installed. Then, from the Versions tab, click `Update` to get a list of available GemStone versions. Check the box for 3.4.3 to download that version. Then, from the Databases tab, click the `+` button to create a new database and click `Start` to start the database. 

When you have a database running, from the Databases tab select the Login subtab and click the `Terminal` button. In the new Terminal navigate to this directory (e.g., `cd ~/code/Python/GemStoneP`). 

Copy the provided `topazini` to `.topazini` and edit `gs64stone` to show the name of your database (e.g., `gs64stone1`). Then from a commmand prompt run `./gsp.sh`. If this finishes without errors then you may proceed to the next step.

### Python 3

Install [Python 3.7.2](https://www.python.org/downloads/release/python-372/). When you open a new terminal and enter `which python3` it should show you `/Library/Frameworks/Python.framework/Versions/3.7/bin/python3` and when you enter `python3 --version` it should show you 3.7.2.

## Sample Code

Our first task is a "Hello World!" program (`hello.py`). From [Jade](https://github.com/jgfoster/Jade) (or another GemStone/S IDE), log in to GemStone and evalute the following expression:

```
PyModule script: '$HOME/code/Python/GemStoneP/hello.py'.
```

Next is a [Python Benchmark Suite](https://github.com/python/performance) that "is intended to be an authoritative source of benchmarks for all Python implementations." This seems like a good target for our work and could be in a directory adjacent to this Git project. Evaluate the following expression:

```
PyModule script: '$HOME/code/Python/performance/pyperformance'.
```

Python comes with a [regression test package](https://docs.python.org/3/library/test.html) that can be launched with `python3 -m test`. This generates a number of errors and even some crashes on macOS, so before trying to get it to run we would need to understand more about what it does and how it is expected to work.



