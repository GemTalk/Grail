# GemStone/P

Run [Python](https://docs.python.org/3/reference/index.html) on GemStone/S 64 Bit. 

## macOS Installation

### Git Checkout

Checkout this Git project to `$HOME/code/Python/GemStoneP` (or to some other place and be prepared to edit things to match your path).

### GemStone/S

[GemStone/S](https://gemtalksystems.com/products/gs64/) can be most easily run on macOS using the free, open source [GemStone.app](https://github.com/jgfoster/GemStoneApp). From the Setup tab, click `Authenticate` and give your password (as an administrator) to allow the helper tool to be installed. Then, from the Versions tab, click `Update` to get a list of available GemStone versions. Check the box for a recent version (3.4.3 at the time of this writing) to download that version. Then, from the Databases tab, click the `+` button to create a new database and click `Start` to start the database. 

When you have a database running, from the Databases tab select the Login subtab and click the `Terminal` button. In the new Terminal navigate to this directory (e.g., `cd ~/code/Python/GemStoneP`). 

Copy the provided `topazini` to `.topazini` and edit `gs64stone` to show the name of your database (e.g., `gs64stone1`). Then from a commmand prompt run `./gsp.sh`. If this finishes without errors then you may proceed to the next step.

### Python 3

Install [Python 3.7.2](https://www.python.org/downloads/release/python-372/). When you open a new terminal and enter `which python3` it should show you `/Library/Frameworks/Python.framework/Versions/3.7/bin/python3` and when you enter `python3 --version` it should show you 3.7.2.

## Sample Code

Our first task is a "Hello World!" program (`hello.py`). From [Jade](https://github.com/jgfoster/Jade) (or another GemStone/S IDE), log in to GemStone and evalute the following expression:

```
PyModule script: '$HOME/code/Python/GemStoneP/hello.py'.
```

Next is a [Python Benchmark Suite](https://github.com/python/performance) that "is intended to be an authoritative source of benchmarks for all Python implementations." This seems like a good target for our work and could be in a directory adjacent to this Git project. Clone this Git project to `~/code/python/performance` and then evaluate the following expression:

```
PyModule script: '$HOME/code/Python/performance/pyperformance'.
```

This is a trivial script that consists mostly of importing another script that can be examined with the following expression:

```
PyModule script: '$HOME/code/Python/performance/performance/cli.py'.
```

Python comes with a [regression test package](https://docs.python.org/3/library/test.html) that can be launched with `python3 -m test`. This generates a number of errors and even some crashes on macOS, so before trying to get it to run we would need to understand more about what it does and how it is expected to work.

## Process

While we could parse source files directly (and may eventually do so), we can take advantage of some built-in Python features to jump ahead to the interesting parts. 

### Tokens

For starters, see Python's *tokenize* command-line option. To see this in action execute the following from a bash command line:

```
python3 -m tokenize -e $HOME/code/Python/performance/performance/cli.py
```

This will show you each token in the file on a separate line with details about the token (including where it begins and ends). This may be useful for implementing a debugger, depending on how much detail we get from the AST (described next).

### Abstract Syntax Tree

Even more helpful is a Python [module](https://docs.python.org/3/library/ast.html) that generates an AST (abstract syntax tree). To see this in action execute the following from a bash command line (or see the output with some pretty-printing in `$HOME/code/Python/GemStoneP/ast.txt`:

```
python3 $HOME/code/Python/GemStoneP/parse.py
```

## Next Steps

### Build an AST using Smalltalk objects

Our initial approach is to let Python generate an AST for us and then use the text representation to build our own AST. We will use the [abstract grammar](https://docs.python.org/3/library/ast.html) as a guide to hand-build subclasses of PyAstNode. 

* PyModule class>>script: is the basic entry point for reading a Python file (module) 
  * PyModule>>load:as: builds an AST for a Module
      * PyModule>>buildStatementsFromAST reads the AST and calls #suite
          * PyAstNode>>suite constructs statements
              * PyStatement class>>statementFrom: looks for a [statement](https://docs.python.org/3/library/ast.html)

*The current task is to complete the implementation of PyStatement class>>statementFrom: and the nodes that are referenced from that node.*

### Translate the AST to Smalltalk Code

We should include a reference to the Python source in some way so that we can trace the Smalltalk code back to the Python code. The information should be in such a format that we can eventually build a debugger.

### Run the Smalltalk Code

When we reach an import statement then the process starts over!

### Automated Tests

One option is to just rely on the Python test suite. So far no effort has been made to build SUnit tests.