CC = cc
CXX = c++
CFLAGS = -Wall -Wextra -fPIC -O2
UNAME_S := $(shell uname -s)
comma := ,

ifeq ($(UNAME_S),Darwin)
  SHARED_EXT = dylib
  SHARED_FLAGS = -dynamiclib
  RPATH_FLAGS = -Wl$(comma)-rpath$(comma)@executable_path
else
  SHARED_EXT = so
  SHARED_FLAGS = -shared
  RPATH_FLAGS =
endif

EXT_OBJECTS = _statisticsmodule.o _bisectmodule.o _crc32cmodule.o _shimtestmodule.o _heapqmodule.o _grail_demo.o

LIB = libcpython_ua.$(SHARED_EXT)
OBJECTS = cpython.o $(EXT_OBJECTS)

all: $(LIB)

# cpython.cc implements the CPython C API + GCI User Actions (requires GEMSTONE)
cpython.o: cpython.cc cpython.h
	$(CXX) -Wall -Wextra -Wno-unused-parameter -fPIC -O2 -I$(GEMSTONE)/include -c cpython.cc -o cpython.o

# Extension modules get -Wno-unused-parameter since we don't control their source
_statisticsmodule.o: _statisticsmodule.c cpython.h
	$(CC) $(CFLAGS) -Wno-unused-parameter -c _statisticsmodule.c

_bisectmodule.o: _bisectmodule.c cpython.h
	$(CC) $(CFLAGS) -c _bisectmodule.c

_crc32cmodule.o: _crc32cmodule.c cpython.h
	$(CC) $(CFLAGS) -c _crc32cmodule.c

_shimtestmodule.o: _shimtestmodule.c cpython.h
	$(CC) $(CFLAGS) -c _shimtestmodule.c

_heapqmodule.o: _heapqmodule.c cpython.h
	$(CC) $(CFLAGS) -Wno-unused-parameter -c _heapqmodule.c

_grail_demo.o: _grail_demo.c cpython.h
	$(CC) $(CFLAGS) -DGRAIL_SHIM -c _grail_demo.c

$(LIB): $(OBJECTS)
	$(CXX) $(SHARED_FLAGS) -o $@ $(OBJECTS) $(GEMSTONE)/lib/gciualib.o -lm -lpthread -undefined dynamic_lookup

GRAIL_LIB_DIR = ../../lib
PYTHON_INCLUDES = $(shell python3-config --includes 2>/dev/null)

dynmods: $(GRAIL_LIB_DIR)/_grail_demo.so

$(GRAIL_LIB_DIR)/_grail_demo.so: _grail_demo.c
	$(CC) $(CFLAGS) $(PYTHON_INCLUDES) $(SHARED_FLAGS) -o $@ _grail_demo.c -undefined dynamic_lookup

clean:
	rm -f $(OBJECTS) $(LIB)

.PHONY: all clean dynmods
