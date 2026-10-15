"https://docs.python.org/3/library/ast.html#ast.keyword

A keyword argument to a function call or class definition.

arg is a raw string of the parameter name (can be None for **kwargs).
value is the expression passed for the argument.

Example:
>>> print(ast.dump(ast.parse('func(a=1, **kwargs)', mode='eval'), indent=4))
Expression(
    body=Call(
        func=Name(id='func', ctx=Load()),
        args=[],
        keywords=[
            keyword(arg='a', value=Constant(value=1)),
            keyword(arg=None, value=Name(id='kwargs', ctx=Load()))]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      KeywordAst(arg value)

"
Class {
	#name : 'KeywordAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'arg',
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
KeywordAst >> arg [
	^arg

]

{ #category : 'Grail-other' }
KeywordAst >> arg: newValue [
	arg := newValue

]

{ #category : 'Grail-other' }
KeywordAst >> name [

	^arg

]

{ #category : 'Grail-other' }
KeywordAst >> value [

	^value

]

{ #category : 'Grail-other' }
KeywordAst >> value: newValue [
	value := newValue

]
