var expect = require('expect.js');
var path = require('path');
var fs = require('../extfs');

describe('extfs', function () {
  var rootPath = path.join(__dirname, '../');

	it('should return all directories', function (done) {
		fs.getDirs(rootPath, function (err, dirs) {
			expect(dirs).to.be.an(Array);
			expect(dirs.length).to.be.greaterThan(0);
			done();
		});
	});

	it('should return all directories sync', function () {
		var dirs = fs.getDirsSync(rootPath);
		expect(dirs).to.be.an(Array);
		expect(dirs.length > 0).to.be.ok();
	});

	it('should check if a file is empty', function (done) {
		var notEmptyFile = path.join(__dirname, '../README.md');
		var emptyFile = './AN EMPTY FILE';
		fs.isEmpty(notEmptyFile, function (empty) {
			expect(empty).to.be(false);
			fs.isEmpty(emptyFile, function (empty) {
				expect(empty).to.be(true);
				done();
			});
		});
	});

	it('should check if a file is empty sync', function () {
    var notEmptyFile = path.join(__dirname, '../README.md');
		var emptyFile = './AN EMPTY FILE';
		var empty = fs.isEmptySync(notEmptyFile);
		expect(empty).to.be(false);
		empty = fs.isEmptySync(emptyFile);
		expect(empty).to.be(true);
	});

	it('should check if a directory is empty', function (done) {
		var notEmptyDir = __dirname;
		var emptyDir = './AN EMPTY DIR';
		fs.isEmpty(notEmptyDir, function (empty) {
			expect(empty).to.be(false);
			fs.isEmpty(emptyDir, function (empty) {
				expect(empty).to.be(true);
				done();
			})
		});
	});

	it('should check if a directory is empty sync', function () {
		var notEmptyDir = __dirname;
		var emptyDir = './AN EMPTY DIR';
		expect(fs.isEmptySync(notEmptyDir)).to.be(false);
		expect(fs.isEmptySync(emptyDir)).to.be(true);
	});

  describe('remove directories', function () {
    var tmpPath = path.join(rootPath, 'tmp');
    var folders = [ 'folder1', 'folder2', 'folder3' ];
    var files = [ '1.txt', '2.txt', '3.txt' ];
    folders = folders.map(function (folder) {
      return path.join(tmpPath, folder);
    });

    /**
     * Create 3 folders with 3 files each
     */
    beforeEach(function () {
      if (!fs.existsSync(tmpPath)) {
        fs.mkdirSync(tmpPath, '0755');
      }
      folders.forEach(function (folder) {
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, '0755');
        }
        files.forEach(function (file) {
          fs.writeFile(path.join(folder, file), 'file content');
        });
      });
    });

    it('should remove a non empty directory', function (done) {
      fs.remove(tmpPath, function (err) {
        expect(err).to.be(null);
        expect(fs.existsSync(tmpPath)).to.be(false);
        done();
      });
    });

    it('should remove a non empty directory synchronously', function () {
      fs.removeSync(tmpPath);
      expect(fs.existsSync(tmpPath)).to.be(false);
    });

    it('should remove an array of directories', function (done) {
      fs.remove(folders, function (err) {
        expect(err).to.be(null);
        expect(fs.existsSync(folders[0])).to.be(false);
        expect(fs.existsSync(folders[1])).to.be(false);
        expect(fs.existsSync(folders[2])).to.be(false);
        expect(fs.existsSync(tmpPath)).to.be(true);
        done();
      });
    });

    it('should remove an array of directories synchronously', function () {
      fs.removeSync(folders);
      expect(fs.existsSync(folders[0])).to.be(false);
      expect(fs.existsSync(folders[1])).to.be(false);
      expect(fs.existsSync(folders[2])).to.be(false);
      expect(fs.existsSync(tmpPath)).to.be(true);
    });

  });

  it('should extends to fs', function () {
    expect(fs.readdir).to.be.a(Function);
  });

});