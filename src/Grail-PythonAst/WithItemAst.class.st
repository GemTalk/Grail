"https://docs.python.org/3/library/ast.html#ast.withitem

A single context manager in a with statement.

context_expr is the context manager expression.
optional_vars is a Name, Tuple, or other node for the as clause (can be None).

Example:
>>> print(ast.dump(ast.parse('with x as y:\\n    ...'), indent=4))
Module(
    body=[
        With(
            items=[
                withitem(
                    context_expr=Name(id='x', ctx=Load()),
                    optional_vars=Name(id='y', ctx=Store()))],
            body=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      WithItemAst(context_expr optional_vars)

"
Class {
	#name : 'WithItemAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'context_expr',
		'optional_vars'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-Accessing' }
WithItemAst >> context_expr [

	^context_expr

]

{ #category : 'Grail-Accessing' }
WithItemAst >> context_expr: newValue [
	context_expr := newValue

]

{ #category : 'Grail-Accessing' }
WithItemAst >> optional_vars [

	^optional_vars

]

{ #category : 'Grail-Accessing' }
WithItemAst >> optional_vars: newValue [
	optional_vars := newValue

]
