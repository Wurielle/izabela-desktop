#!/usr/bin/env node

var path = require("path");
var fs = require("fs-extra");
var util = require("util");
var prompt = require("prompt");
var child_process = require("child_process");

var colors = require("colors");
var zipFolder = require("zip-folder");
var pkgInfo = require('pkginfo')(module);
var packager = require("electron-packager");
var beautify = require("js-beautify").js_beautify;
var removeEmptyDirs = require("remove-empty-directories");

var appDir = "./app/";
var releasesDir = "./releases";
var cachedDependsDir = "./cached_node_modules";

var babelPath = path.normalize("node_modules/.bin/babel");
var minifyPath = path.normalize("node_modules/.bin/minify");

var repoDir = "";
var configPath = "";
var packagePath = "";

var config = {};
var packageJSON = {};

var platforms = [];

var validPlatforms =
	[
		"win32",
		"linux",
		"darwin"
	];

var ignoreList = IgnoreList();

function IgnoreList()
{
	var list = [];

	function search(searchItem)
	{
		for (var cnt = 0; cnt < list.length; cnt++)
		{
			var item = list[cnt];

			if (item === searchItem)
				return cnt;

			if (item.slice(-1) == "/")
			{
				searchItem = searchItem.replace("\\", "/");

				if (searchItem.indexOf(item) === 0)
					return cnt;
			}
			else
			{
				if (searchItem === path.parse(item).base)
					return cnt;
			}
		}

		return -1;
	}

	return {
		set: function (ignoreList)
		{
			if (ignoreList === undefined)
				return;

			list = ignoreList;
		},

		get: function ()
		{
			return list;
		},

		search: function (searchItem)
		{
			return search(searchItem);
		}
	};
}

function logTitle()
{
	if (arguments.length === 0)
		return;

	console.log("");
	console.log(util.format.apply(util, arguments));
	console.log("");
}

function logError()
{
	if (arguments.length === 0)
		return;

	arguments[0] = colors.red(arguments[0]);
	console.log(util.format.apply(util, arguments));
}

function displayWelcome()
{
	console.log("");
	console.log("electron-compiler %s", module.exports.version);
	console.log("-----------------------");
	console.log("");
}

function readEnvironment()
{
	if (process.argv.length < 3)
	{
		logError("Applicaton path not found.");
		return false;
	}

	repoDir = process.argv[2].replace("\"", "");

	var stats = null;

	try
	{
		stats = fs.statSync(repoDir);

		if (!stats.isDirectory())
		{
			logError("%s is not a valid directory.", repoDir);
			return false;
		}

	}
	catch (error)
	{
		logError("%s is not a valid directory. %s", repoDir, error);
		return false;
	}

	packagePath = path.join(repoDir, "package.json");

	try
	{
		stats = fs.statSync(packagePath);

		if (!stats.isFile())
		{
			logError("package.json was not found in %s.", repoDir);
			return false;
		}
	}
	catch (error)
	{
		logError("package.json was not found in %s.", repoDir);
		return false;
	}

	try
	{
		packageJSON = JSON.parse(fs.readFileSync(packagePath));
	}
	catch (error)
	{
		logError("Failed to parse package.json. %s", error);
		return false;
	}

	configPath = path.join(repoDir, "electron_compiler.json");

	try 
	{
		config = JSON.parse(fs.readFileSync(configPath));
	}
	catch (error)
	{
		logError("Failed to parse electron_compiler.json.");
		return false;
	}

	ignoreList.set(config.ignoreList);

	config.appName = packageJSON.productName;

	if (config.appName === undefined || config.appName.length === 0)
		config.appName = packageJSON.name;

	if (config.versionString === undefined)
	{
		config.versionString =
			{
				"CompanyName": "",
				"FileDescription": "",
				"OriginalFilename": "",
				"ProductName": "",
				"InternalName": ""
			};
	}

	if (config.uglifyList === undefined)
		config.uglifyList = [];

	if (config.verifyConfig === undefined)
		config.verifyConfig = true;
	
	if (config.archiveOutput === undefined)
		config.archiveOutput = true;

	if (!detectPlatforms())
		return false;

	dumpConfig();
	console.log("");
	testPaths();

	return true;
}

function detectPlatforms()
{
	if (config.platforms === undefined || config.platforms.length === 0)
	{
		console.log("Specify at least one platform to build for.");
		return false;
	}

	var success = true;

	config.platforms.forEach(
		function (item)
		{
			if (!success)
				return;

			if (validPlatforms.indexOf(item) === -1)
			{
				console.log("%s is not a valid platform.", item);
				success = false;

				return;
			}

			var platform =
				{
					"name": item,
					"done": false
				};

			platforms.push(platform);
		});

	return success;
}

function dumpConfig()
{
	console.log("Application: %s", config.appName);
	console.log("Current version: %s", packageJSON.version);
	console.log("");
	console.log("Building for: %s", config.platforms.join(", "));

	if (ignoreList.get().length > 0)
		console.log("Ignoring: %s", ignoreList.get().join(", "));

	if (config.uglifyList.length > 0)
		console.log("Uglifying: %s", config.uglifyList.join(", "));
}

function testPaths()
{
	config.uglifyList.forEach(
		function (item)
		{
			item = path.join(repoDir, item);

			try
			{
				fs.statSync(item);
			}
			catch (error)
			{
				logError("Invalid path in uglify list: %s. %s", item, error);
			}
		});

	ignoreList.get().forEach(
		function (item)
		{
			item = path.join(repoDir, item);

			try
			{
				fs.statSync(item);
			}
			catch (error)
			{
				logError("Invalid path in ignore list: %s. %s", item, error);
			}
		});
}

function verifyConfig(callback)
{
	if (!config.verifyConfig)
	{
		callback(true);
		return;
	}

	console.log("");

	var schema =
		{
			"properties":
			{
				"startBuild":
				{
					"description": "Start build?",
					"type": "string",
					"default": "y",
					"required": true
				}
			}
		};

	prompt.get(schema,
		function (err, result)
		{
			console.log(result.startBuild);

			if (result.startBuild === "y")
			{
				callback(true);
				return;
			}

			callback(false);
		});
}

function clean()
{
	logTitle("Cleaning build environment...");

	console.log("Removing %s", appDir);

	try
	{
		fs.removeSync(appDir);
	}
	catch (error)
	{
		logError("Failed to remove %s. %s", appDir, error);
		return false;
	}

	console.log("Build environment cleaned.");
	return true;
}

function copyRepo()
{
	logTitle("Copying repository to build environment...");

	function isItemAllowed(item)
	{
		item = path.relative(repoDir, item);

		if (item === "")
			return true;

		if (ignoreList.search(item) > -1)
			return false;

		console.log("Copying %s...", item);
		return true;
	}

	var options =
		{
			"filter": isItemAllowed
		};

	try
	{
		fs.copySync(repoDir, appDir, options);
	}
	catch (error)
	{
		logError("Failed to copy repository to %s. %s", appDir, error);
		return false;
	}

	console.log("");
	console.log("Removing empty directories...");

	removeEmptyDirs(appDir);

	console.log("");
	console.log("Application copied to %s", appDir);

	return true;
}

function uglifyDir(dirPath)
{
	try
	{
		var dirItems = fs.readdirSync(dirPath);

		dirItems.forEach(
			function (item)
			{
				var fullPath = path.join(dirPath, item);
				var stats = fs.statSync(fullPath);

				if (stats.isDirectory())
				{
					uglifyDir(fullPath);
				}
				else
				{
					uglifyFile(fullPath);
				}
			});
	}
	catch (error)
	{
		console.log("Failed to read directory %s. %s", dirPath, error);
	}
}

function uglifyFile(filePath)
{
	console.log("Uglifying %s...", filePath);

	var options =
		{
			"stdio": "inherit"
		};

	var cmd = "";

	switch (path.parse(filePath).ext)
	{
		case ".js":
			cmd = babelPath + " " + filePath + " --out-file " + filePath + " --presets babili";
			break;

		case ".css":
			cmd = minifyPath + " " + filePath + " --output " + filePath;
			break;

		default:
			logError("%s cannot be uglified.", filePath);
			return false;
	}

	try
	{
		child_process.execSync(cmd, options);
	}
	catch (error)
	{
		logError("Failed to uglify %s. %s", filePath, error);
		return false;
	}

	return true;
}

function uglifyApp()
{
	logTitle("Uglifying source code...");

	var success = true;

	config.uglifyList.forEach(
		function (item)
		{
			if (!success)
				return;

			item = path.join(appDir, item);

			if (item.slice(-1) == path.sep)
			{
				uglifyDir(item);
				return;
			}

			if (!uglifyFile(item))
				success = false;
		});

	return success;
}

function isCachedDepends()
{
	try
	{
		var stats = fs.statSync(cachedDependsDir);

		if (!stats.isDirectory())
			return false;
	}
	catch (error)
	{
		return false;
	}

	return true;
}

function copyCachedDepends()
{
	console.log("Copying cached dependencies...");

	var dest = appDir + "node_modules";

	var options =
		{
			"clobber": false
		};

	try
	{
		fs.copySync(cachedDependsDir, dest, options);
	}
	catch (error)
	{
		logError("Failed to copy cached dependencies. %s", error);
	}
}

function cacheDepends()
{
	console.log("Caching dependencies...");

	var source = appDir + "node_modules";

	var options =
		{
			"clobber": false
		};

	try
	{
		fs.copySync(source, cachedDependsDir, options);
	}
	catch (error)
	{
		logError("Failed to cache dependencies. %s", error);
	}
}

function installDepends()
{
	logTitle("Installing npm dependencies...");

	var useCachedDepends = isCachedDepends();

	if (useCachedDepends)
		copyCachedDepends();

	var options =
		{
			"cwd": appDir,
			"stdio": "inherit"
		};

	try
	{
		child_process.execSync("npm install", options);
	}
	catch (error)
	{
		logError("Failed to install npm dependencies. %s", error);
		return false;
	}

	if (!useCachedDepends)
		cacheDepends();

	return true;
}

function updateVersion()
{
	var version = packageJSON.version.split(".");

	if (version.length < 3)
	{
		logError("Invalid version format.");
		return false;
	}

	var minorVersion = parseInt(version[2]);
	version[2] = ++minorVersion;

	packageJSON.version = version.join(".");
	return true;
}

function isAllPlatformsReady()
{
	var allReady = true;

	platforms.forEach(
		function (platform)
		{
			if (!allReady)
				return;

			if (platform.done)
				return;

			allReady = false;
		});

	return allReady;
}

function archiveOutput(platform, outputPath, callback)
{
	if (!config.archiveOutput ||
		platform === "darwin")
	{
		callback(null);
		return;
	}

	console.log("");
	console.log("Archiving %s output...", platform);

	var archivePath = outputPath + ".zip";

	zipFolder(outputPath, archivePath,
		function (error)
		{
			if (error)
			{
				logError("Failed to archive output for %s. %s", platform);
			}
			else
			{
				console.log("Archived %s output at %s.", platform, archivePath);

				console.log("Removing %s output directory...", platform);
				fs.removeSync(outputPath);
			}

			callback(error);
		});
}

function runPackager(platform, callback)
{
	logTitle("Packaging application for %s...", platform);

	var iconPath = path.join(repoDir, "icons/icon.");

	switch (platform)
	{
		case "win32":
		case "linux":
			iconPath += "ico";
			break;

		case "darwin":
			iconPath += "icns";
			break;
	}

	var options =
		{
			"dir": appDir,
			"arch": "x64",
			"platform": platform,
			"app-copyright": config.versionString.CompanyName,
			"app-version": packageJSON.version,
			"icon": iconPath,
			"name": config.appName,
			"out": releasesDir,
			"overwrite": true,
			"prune": true,
			"version-string": config.versionString
		};

	packager(options,
		function (error, appPaths)
		{
			if (error !== null)
			{
				logError("Packaging failed for %s. %s", platform, error);

				callback(error);
				return;
			}
			else if (appPaths.length === 0)
			{
				logError("Packaging failed for %s", platform);

				callback(error);
				return;
			}
			else
			{
				console.log("Packaged %s successfully to %s.", platform, appPaths[0]);
			}

			archiveOutput(platform, appPaths[0], callback);
		});
}

function savePackageJSON()
{
	logTitle("Updating package.json in repository...");

	var options =
		{
			"indent_with_tabs": true,
			"brace_style": "expand",
			"end_with_newline": true
		};

	var data = beautify(JSON.stringify(packageJSON), options);

	if (data.length === 0)
	{
		logError("Failed to beautify package.json.");
		return false;
	}

	try
	{
		fs.writeFileSync(packagePath, data);
	}
	catch (error)
	{
		logError("Failed to copy package.json to repository. %s", error);
		return false;
	}

	console.log("Updated package.json in repository.");
	return true;
}

function run(callback)
{
	prompt.start();

	displayWelcome();

	if (!readEnvironment())
	{
		callback();
		return;
	}

	verifyConfig(
		function (startBuild)
		{
			if (!startBuild)
				return;

			build(callback);
		});
}

function build(callback)
{
	if (!clean())
	{
		callback();
		return;
	}

	if (!copyRepo())
	{
		callback();
		return;
	}

	if (!uglifyApp())
	{
		callback();
		return;
	}

	if (!installDepends())
	{
		callback();
		return;
	}

	if (!updateVersion())
	{
		callback();
		return;
	}

	platforms.forEach(
		function (platform)
		{
			runPackager(platform.name,
				function (error)
				{
					platform.done = true;

					if (isAllPlatformsReady())
					{
						savePackageJSON();
						clean();

						callback();
					}
				}
			);
		});
}

run(
	function (error)
	{
		process.exit();
	});
