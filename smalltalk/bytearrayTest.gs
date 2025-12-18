! ------------------- Remove existing behavior from bytearrayTest
removeallmethods bytearrayTest
removeallclassmethods bytearrayTest
! ------------------- Class methods for bytearrayTest
! ------------------- Instance methods for bytearrayTest
category: 'done'
method: bytearrayTest
test__delitem__

	| ba |
	ba := bytearray ___value: #[1 2 3 4 5].
	ba __delitem__: (int ___value: 2).
	self assert: ba equals: (bytearray ___value: #[1 2 4 5]).
	ba __delitem__: (int ___value: -1).
	self assert: ba equals: (bytearray ___value: #[1 2 4]).
%
category: 'done'
method: bytearrayTest
test__setitem__

	| ba |
	ba := bytearray ___value: #[1 2 3].
	ba __setitem__: (int ___value: 1) _: (int ___value: 99).
	self assert: ba equals: (bytearray ___value: #[1 99 3]).
	ba __setitem__: (int ___value: -1) _: (int ___value: 88).
	self assert: ba equals: (bytearray ___value: #[1 99 88]).
%
category: 'done'
method: bytearrayTest
testappend

	| ba |
	ba := bytearray ___value: #[1 2 3].
	ba append: (int ___value: 4).
	self assert: ba equals: (bytearray ___value: #[1 2 3 4]).
%
category: 'done'
method: bytearrayTest
testclear

	| ba |
	ba := bytearray ___value: #[1 2 3].
	ba clear.
	self assert: ba equals: (bytearray ___value: #[]).
%
category: 'done'
method: bytearrayTest
testcopy

	| ba copy |
	ba := bytearray ___value: #[1 2 3].
	copy := ba copy.
	self assert: copy equals: ba.
	self assert: copy class equals: bytearray.
	ba append: (int ___value: 4).
	self assert: copy equals: (bytearray ___value: #[1 2 3]).
%
category: 'done'
method: bytearrayTest
testextend

	| ba |
	ba := bytearray ___value: #[1 2 3].
	ba extend: (list ___value: { int ___value: 4. int ___value: 5 }).
	self assert: ba equals: (bytearray ___value: #[1 2 3 4 5]).
%
category: 'done'
method: bytearrayTest
testinsert

	| ba |
	ba := bytearray ___value: #[1 2 3].
	ba insert: (int ___value: 1) _: (int ___value: 99).
	self assert: ba equals: (bytearray ___value: #[1 99 2 3]).
	ba insert: (int ___value: 0) _: (int ___value: 0).
	self assert: ba equals: (bytearray ___value: #[0 1 99 2 3]).
%
category: 'done'
method: bytearrayTest
testpop

	| ba val |
	ba := bytearray ___value: #[1 2 3 4 5].
	val := ba pop.
	self assert: val equals: (int ___value: 5).
	self assert: ba equals: (bytearray ___value: #[1 2 3 4]).
	val := ba pop: (int ___value: 0).
	self assert: val equals: (int ___value: 1).
	self assert: ba equals: (bytearray ___value: #[2 3 4]).
%
category: 'done'
method: bytearrayTest
testremove

	| ba |
	ba := bytearray ___value: #[1 2 3 2 4].
	ba remove: (int ___value: 2).
	self assert: ba equals: (bytearray ___value: #[1 3 2 4]).
%
category: 'done'
method: bytearrayTest
testreverse

	| ba |
	ba := bytearray ___value: #[1 2 3 4 5].
	ba reverse.
	self assert: ba equals: (bytearray ___value: #[5 4 3 2 1]).
%
category: 'todo'
method: bytearrayTest
test__add__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__alloc__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__contains__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__getitem__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__iadd__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__imul__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__iter__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__len__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__mod__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__mul__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__rmod__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
test__rmul__

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testcapitalize

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testcenter

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testcount

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testdecode

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testendswith

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testexpandtabs

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testfind

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testfromhex

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testhex

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testindex

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testisalnum

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testisalpha

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testisascii

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testisdigit

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testislower

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testisspace

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testistitle

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testisupper

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testjoin

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testljust

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testlower

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testlstrip

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testmaketrans

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testpartition

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testremoveprefix

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testremovesuffix

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testreplace

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testrfind

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testrindex

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testrjust

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testrpartition

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testrsplit

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testrstrip

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testsplit

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testsplitlines

   #pyTodo
%
category: 'todo'
method: bytearrayTest
teststartswith

   #pyTodo
%
category: 'todo'
method: bytearrayTest
teststrip

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testswapcase

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testtitle

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testtranslate

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testupper

   #pyTodo
%
category: 'todo'
method: bytearrayTest
testzfill

   #pyTodo
%
