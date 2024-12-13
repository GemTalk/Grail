# Grail

Run [Python](https://docs.python.org/3/reference/index.html) on GemStone/S 64 Bit.

## macOS Installation

### Git Checkout

Checkout this Git project to `$HOME/code/Python/Grail` (or to some other place and be prepared to edit things to match your path).

### GemStone/S

[GemStone/S](https://gemtalksystems.com/products/gs64/) can be most easily run on macOS using the free, open source [GemStone.app](https://github.com/jgfoster/GemStoneApp). From the Setup tab, click `Authenticate` and give your password (as an administrator) to allow the helper tool to be installed. Then, from the Versions tab, click `Update` to get a list of available GemStone versions. Check the box for a recent version (3.7.1 at the time of this writing) to download that version. Then, from the Databases tab, click the `+` button to create a new database and click `Start` to start the database.

Copy the provided `topazini` to `.topazini` and edit `gs64stone` to show the name of your database (e.g., `gs64stone1`). Copy the provided `setenv` to `.setenv` and edit the path to point to your GemStone install. Then open a terminal in this directory and run `./install.sh`. If this finishes without errors then you may proceed to the next step.

### Python 3

Install the following:

  * [Python](https://www.python.org/downloads/). When you enter `python3 --version` it should show you 3.12.4 or later. 
  * [pip](https://docs.python.org/3/installing/index.html) is used to install Python packages. When you enter `pip --version` it should show you 24.1.2 or later.
  * [pprintast](https://pypi.org/project/pprintast/) is used to parse Python source files. When you enter `pprintast --version` it should show you 1.2.1 or later.

## Sample Code

### Hello World
Our first task is a "Hello World!" program (`hello.py`). From [Jade](https://github.com/jgfoster/Jade) (or another GemStone/S IDE), log in to GemStone and evalute the following expression:

```
ModuleAst script: '$HOME/code/Python/Grail/tests/hello.py'.
```

### Benchmark
Next is a [Python Benchmark Suite](https://github.com/python/performance) that "is intended to be an authoritative source of benchmarks for all Python implementations." This seems like a good target for our work and could be in a directory adjacent to this Git project. Clone this Git project to `~/code/python/performance` and then evaluate the following expression:

```
ModuleAst script: '$HOME/code/Python/performance/pyperformance'.
```

This is a trivial script that consists mostly of importing another script that can be examined with the following expression:

```
ModuleAst script: '$HOME/code/Python/performance/performance/cli.py'.
```

### Regression Tests
Python comes with a [regression test package](https://docs.python.org/3/library/test.html) that can be launched with `python3 -m test`. This generates a number of errors and even some crashes on macOS, so before trying to get it to run we would need to understand more about what it does and how it is expected to work.

## Process

While we could parse source files directly (and may eventually do so), we can take advantage of some built-in Python features to jump ahead to the interesting parts.

### Abstract Syntax Tree

Python has a module [ast](https://docs.python.org/3/library/ast.html) that generates an AST (abstract syntax tree). To see this in action evaluate the following in a workspace:

```
ModuleAst astForPath: '$HOME/code/Python/Grail/hello.py'
```

## Next Steps

### Build an AST using Smalltalk objects

Our initial approach is to let Python generate an AST for us and then use the text representation to build our own AST. We will use the [abstract grammar](https://docs.python.org/3/library/ast.html) as a guide to hand-build subclasses of AstNode.

* ModuleAst class>>script: is the basic entry point for reading a Python file (module)
  * ModuleAst>>load:as: builds an AST for a Module
      * ModuleAst>>buildStatementsFromAST reads the AST and calls #suite
          * ModuleAst>>suite constructs statements
              * StatementAst class>>statementFrom: looks for a [statement](https://docs.python.org/3/library/ast.html)

### Translate the AST to Smalltalk Code

We should include a reference to the Python source in some way so that we can trace the Smalltalk code back to the Python code. The information should be in such a format that we can eventually build a debugger.

### Run the Smalltalk Code

When we reach an import statement then the process starts over!

### Automated Tests

Eventually we will rely on the Python test suite, but for now have started with a number of SUnit tests.
