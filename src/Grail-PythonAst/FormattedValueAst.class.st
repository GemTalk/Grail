"https://docs.python.org/3/library/ast.html#ast.FormattedValue

Node representing a single formatting field in an f-string.

value is any expression node (such as a literal, a variable, or a function call).
conversion is an integer:
  -1: no formatting
  97 (ord('a')): !a ASCII formatting
  114 (ord('r')): !r repr() formatting
  115 (ord('s')): !s string formatting
format_spec is a JoinedStr node representing the formatting of the value, or None if no format was specified.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        FormattedValueAst(value conversion format_spec)

"
Class {
	#name : 'FormattedValueAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'value',
		'conversion',
		'format_spec'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
FormattedValueAst >> conversion [
	^conversion

]

{ #category : 'Grail-IR Codegen' }
FormattedValueAst >> conversion: newValue [
	conversion := newValue

]

{ #category : 'Grail-IR Codegen' }
FormattedValueAst >> format_spec [
	^format_spec

]

{ #category : 'Grail-IR Codegen' }
FormattedValueAst >> format_spec: newValue [
	format_spec := newValue

]

{ #category : 'Grail-IR Codegen' }
FormattedValueAst >> value [
	^value

]

{ #category : 'Grail-IR Codegen' }
FormattedValueAst >> value: newValue [
	value := newValue

]
