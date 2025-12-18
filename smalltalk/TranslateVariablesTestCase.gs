! ------------------- Remove existing behavior from TranslateVariablesTestCase
removeallmethods TranslateVariablesTestCase
removeallclassmethods TranslateVariablesTestCase
! ------------------- Class methods for TranslateVariablesTestCase
! ------------------- Instance methods for TranslateVariablesTestCase
category: 'other'
method: TranslateVariablesTestCase
_testNonlocalAndModifyGlobalTODO
	"TODO: These tests are commented out and need to be implemented.
	They test:
	1. Modifying global variables in local scope
	2. Nonlocal variable access
	3. Closures with nonlocal variables"

	| pyString |
	pyString := '# modify global variable in local scope
def rum():
    global x
    x = x + 2
    print(x, end='' '')
    return x

w = rum() # 7
print(x, end='' '') # 7

# nonlocal
def outer():
    var = "local"

    def inner():
        nonlocal var
        var = "nonlocal"

    print(var, end='' '') # local
    inner()
    print(var, end='' '') # nonlocal
    return var

v = outer()

def fa():
    x = 0
    def fSet(y):
        nonlocal x
        x = y
    def fGet():
        return x
    return (fSet, fGet)

set1, get1 = fa()
set2, get2 = fa()
set1(3)
set2(4)
print(get1(), get2(), end='' '')'.

	"When these features are implemented, uncomment and refactor this test
	to use output redirection like the other tests in this class."
	self skip: 'TODO: Implement nonlocal and global variable modification support'.
%
category: 'other'
method: TranslateVariablesTestCase
outputStream

	^outputStream
%
category: 'other'
method: TranslateVariablesTestCase
setUp

	super setUp.
	outputStream := WriteStream with: String new.
	builtins printFile: outputStream.
%
category: 'other'
method: TranslateVariablesTestCase
tearDown

	builtins printFile: nil.
	super tearDown.
%
category: 'other'
method: TranslateVariablesTestCase
testAccessGlobalVariableInGlobalScope

	| pyString ast codeStream |
	pyString := 'x = 5
print(x, end='''')'.
	ast := ModuleAst astForSource: pyString.
	codeStream := PrettyWriteStream on: String new.
	ast printSmalltalkOn: codeStream.

	codeStream contents evaluate.
	self assert: self outputStream contents equals: '5'.
%
category: 'other'
method: TranslateVariablesTestCase
testAccessGlobalVariableInLocalScope

	| pyString ast codeStream |
	pyString := 'x = 5

def foo():
    global y, z
    print(x, end='''')
    return x

foo()'.
	ast := ModuleAst astForSource: pyString.
	codeStream := PrettyWriteStream on: String new.
	ast printSmalltalkOn: codeStream.

	codeStream contents evaluate.
	self assert: self outputStream contents equals: '5'.
%
category: 'other'
method: TranslateVariablesTestCase
testCreateLocalVariableInLocalScope

	| pyString ast codeStream |
	pyString := 'x = 5

def bar():
    x = 6
    print(x, end='''')
    return x

z = bar()
print(x, end='''')'.
	ast := ModuleAst astForSource: pyString.
	codeStream := PrettyWriteStream on: String new.
	ast printSmalltalkOn: codeStream.

	codeStream contents evaluate.
	self assert: self outputStream contents equals: '65'.
%
