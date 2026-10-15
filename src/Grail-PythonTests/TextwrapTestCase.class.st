Class {
	#name : 'TextwrapTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testDedent [
	| result |
	result := self eval: 'import textwrap
text = "    def f():\n        pass\n"
textwrap.dedent(text) == "def f():\n    pass\n"'.
	self assert: result

]

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testDedentIgnoresBlankLines [
	"Whitespace-only lines neither contribute to the margin nor keep
	their whitespace in the output."

	| result |
	result := self eval: 'import textwrap
text = "  a\n\n  b"
textwrap.dedent(text) == "a\n\nb"'.
	self assert: result

]

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testIndent [
	"Default predicate skips whitespace-only lines."

	| result |
	result := self eval: 'import textwrap
text = "a\n\nb\n"
textwrap.indent(text, "> ") == "> a\n\n> b\n"'.
	self assert: result

]

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testIndentWithPredicate [
	| result |
	result := self eval: 'import textwrap
def always(line):
    return True
text = "a\n\nb"
textwrap.indent(text, "+", always) == "+a\n+\n+b"'.
	self assert: result

]

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testShorten [
	| result |
	result := self eval: 'import textwrap
a = textwrap.shorten("Hello  world!", 15)
b = textwrap.shorten("Hello world foo bar", 12)
a == "Hello world!" and b == "Hello [...]"'.
	self assert: result

]

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testWrapAndFill [
	| result |
	result := self eval: 'import textwrap
lines = textwrap.wrap("aa bb cc dd", 5)
filled = textwrap.fill("aa bb cc dd", 5)
lines == ["aa bb", "cc dd"] and filled == "aa bb\ncc dd"'.
	self assert: result

]

{ #category : 'Grail-Tests - textwrap' }
TextwrapTestCase >> testWrapIndents [
	| result |
	result := self eval: 'import textwrap
lines = textwrap.wrap("aa bb cc", 6, initial_indent="* ", subsequent_indent="  ")
lines == ["* aa", "  bb", "  cc"]'.
	self assert: result

]
