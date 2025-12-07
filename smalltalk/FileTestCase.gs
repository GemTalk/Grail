! ------------------- Remove existing behavior from FileTestCase
removeallmethods FileTestCase
removeallclassmethods FileTestCase
! ------------------- Class methods for FileTestCase
! ------------------- Instance methods for FileTestCase
category: 'other'
method: FileTestCase
testOpen

	| result pyString |
	pyString := '
f = open("/tmp/file.txt", "w")
f.write("Hello, World!") 
f.close()

f = open("/tmp/file.txt", "r")
content = f.read()
f.close()
content
'.
	ModuleAst astForSource: pyString.

	result := ModuleAst evaluate: pyString.
	self assert: result ___value = 'Hello, World!'.
%
