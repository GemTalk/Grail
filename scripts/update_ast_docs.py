#!/usr/bin/env python3
"""
Script to generate documentation updates for AST classes.
This creates the documentation strings based on Python AST documentation.
"""

# Mapping of Grail class names to Python AST class names and their documentation
AST_DOCS = {
    "ConstantAst": {
        "python_name": "Constant",
        "url": "https://docs.python.org/3/library/ast.html#ast.Constant",
        "doc": """A constant value.

The value attribute of the Constant literal contains the Python object it represents.
The values represented can be instances of str, bytes, int, float, complex, and bool,
and the constants None and Ellipsis.

Example:
>>> print(ast.dump(ast.parse('123', mode='eval'), indent=4))
Expression(
    body=Constant(value=123))""",
        "fields": "value kind"
    },
    
    "DictAst": {
        "python_name": "Dict",
        "url": "https://docs.python.org/3/library/ast.html#ast.Dict",
        "doc": """A dictionary.

keys and values hold lists of nodes representing the keys and the values respectively,
in matching order (what would be returned when calling dictionary.keys() and dictionary.values()).

When doing dictionary unpacking using dictionary literals the expression to be expanded
goes in the values list, with a None at the corresponding position in keys.

Example:
>>> print(ast.dump(ast.parse('{"a":1, **d}', mode='eval'), indent=4))
Expression(
    body=Dict(
        keys=[Constant(value='a'), None],
        values=[Constant(value=1), Name(id='d', ctx=Load())]))""",
        "fields": "keys values"
    },
    
    "DictCompAst": {
        "python_name": "DictComp",
        "url": "https://docs.python.org/3/library/ast.html#ast.DictComp",
        "doc": """A dictionary comprehension.

key and value are single nodes representing the parts that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse('{x: x**2 for x in numbers}', mode='eval'), indent=4))
Expression(
    body=DictComp(
        key=Name(id='x', ctx=Load()),
        value=BinOp(left=Name(id='x', ctx=Load()), op=Pow(), right=Constant(value=2)),
        generators=[comprehension(target=Name(id='x', ctx=Store()), iter=Name(id='numbers', ctx=Load()), is_async=0)]))""",
        "fields": "key value generators"
    },
}

# Print sample output for one class
if __name__ == "__main__":
    for class_name, info in AST_DOCS.items():
        print(f"Class: {class_name}")
        print(f"Python name: {info['python_name']}")
        print(f"URL: {info['url']}")
        print(f"Documentation:\n{info['doc']}")
        print(f"Fields: {info['fields']}")
        print("-" * 80)

