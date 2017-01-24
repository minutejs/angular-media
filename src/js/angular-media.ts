/// <reference path="E:/var/Dropbox/projects/buzzvid/public/static/bower_components/minute/_all.d.ts" />

module App {
    export class AngularMedia implements ng.IServiceProvider {
        constructor() {
            this.$get.$inject = ['$rootScope', '$q', '$http', '$timeout', '$ui', '$search', '$preview', '$youtube'];
        }

        $get = ($rootScope: ng.IRootScopeService, $q: ng.IQService, $http: ng.IHttpService, $timeout: ng.ITimeoutService, $ui: any, $search: any, $preview: any,
                $youtube: any) => {
            let service: any = {};

            service.popup = (query = 'keyword', args: any = {tabs: ['images', 'videos', 'upload',], multiple: true, autoSearch: true, proxy: true, withMetadata: true}) => {
                var deferred = $q.defer();
                var resolve = (results) => deferred.resolve(results);
                var data: any = {args: args, resolve: resolve, term: query, sources: {}, license: {}, uploads: [], metadata: {}, uploading: false};
                var watch: any = () => 1;
                var ctrl = {
                    resolve: (urls) => {
                        $ui.closeLastPopup();

                        if (args.withMetadata) {
                            var results = [];
                            angular.forEach(angular.isArray(urls) ? urls : [urls], (url) => {
                                results.push(angular.extend({title: ctrl.baseName(url)}, data.metadata[url], {src: url}));
                            });

                            deferred.resolve(!args.multiple ? results[0] : results);
                        } else {
                            deferred.resolve(urls);
                        }
                    },
                    submit: () => {
                        let sel = ctrl.getSelected();

                        if (!args.proxy) {
                            ctrl.resolve(sel);
                        } else {
                            var promises = [];
                            var urls = [];

                            data.uploading = true;

                            angular.forEach(angular.isArray(sel) ? sel : [sel], (url) => {
                                var req = $q.defer();
                                promises.push(req.promise);

                                $http.post('/generic/proxy', {url: url}).then((result: any) => {
                                    let upload = result.data.url;

                                    if (upload) {
                                        urls.push(upload);
                                        data.metadata[upload] = data.metadata[url];
                                    } else {
                                        $ui.toast('Could not save ' + ctrl.baseName(url), 'error');
                                    }

                                    req.resolve();
                                }, (error) => req.resolve());
                            });

                            $q.all(promises).then(() => ctrl.resolve(urls));
                        }
                    },
                    search: (type, term) => {
                        if (!!term && /images|video/.test(type)) {
                            data.results = {};
                            data.searching = true;
                            var promise = $search[type === 'images' ? 'imageSearch' : 'youtubeSearch'](term, data.license[type] == 'creativeCommon');
                            promise.then((results) => {
                                data.results[type] = results;
                                angular.forEach(results, (result) => data.metadata[result.src] = result);
                            });
                            promise.finally(() => data.searching = false);
                        }
                    },
                    abort: () => {
                        data.searching = false;
                    },
                    select: (url) => {
                        if (!args.multiple) {
                            data.source = url;
                        } else {
                            data.sources[url] = !data.sources[url];
                        }
                    },
                    preview: (type, url) => {
                        if (type == 'images') {
                            $preview.lightbox([url]);
                        } else {
                            if (/youtube\.com/i.test(url)) {
                                console.log("$youtube: ", $youtube);
                                $youtube.popup(url);
                            } else {
                                window.open(url, '_blank');
                            }
                        }
                    },
                    upload: (sources) => {
                        if (!args.multiple) {
                            data.source = sources;
                            data.uploads = [sources];
                            data.metadata[sources] = {title: ctrl.baseName(sources)};
                        } else {
                            angular.forEach(sources, (src) => {
                                data.sources[src] = true;
                                data.uploads.splice(0, 0, src);
                                data.metadata[src] = {title: ctrl.baseName(src)};
                            });
                        }
                    },
                    getUploads: () => {
                        let results = [];

                        if (!args.multiple) {
                            if (data.uploads && data.source && data.uploads[0] === data.source) {
                                results.push(data.source);
                            }
                        } else {
                            angular.forEach(data.uploads, (src) => {
                                if (data.sources[src]) {
                                    results.push(src);
                                }
                            });
                        }

                        return results;
                    },
                    removeUpload: (url) => {
                        if (!args.multiple) {
                            data.source = null;
                        } else {
                            data.sources[url] = false;
                        }
                    },
                    hasSource: () => {
                        if (!args.multiple) {
                            return !!data.source;
                        } else {
                            let enabled = Minute.Utils.enabledKeys(data.sources);
                            return enabled && !!enabled.length;
                        }
                    },
                    getSelected: () => {
                        if (!args.multiple) {
                            return data.source;
                        } else {
                            return Minute.Utils.enabledKeys(data.sources);
                        }
                    },
                    isSelected: (url) => {
                        let sel = ctrl.getSelected();
                        return !args.multiple ? sel === url : sel.indexOf(url) !== -1;
                    },
                    getType: (url) => {
                        return /\.(png|gif|jpg|jpeg)$/.test(url) ? 'image' : 'other';
                    },
                    baseName: (url) => {
                        return Minute.Utils.basename(url)
                    },
                };

                if (args.autoSearch) {
                    watch = $rootScope.$watch(() => data && data.tabs ? data.tabs.selectedTab : null, (tab) => ctrl.search(tab, data.term));
                }

                $ui.popupUrl('/static/bower_components/angular-media/src/js/templates/media-popup.html', true, null, {ctrl: ctrl, data: data}).then(watch);

                return deferred.promise;
            };

            service.init = () => {
                return service;
            };

            return service.init();
        }
    }

    angular.module('AngularMedia', ['MinuteFramework', 'AngularSearch', 'AngularYouTubePopup'])
        .provider("$media", AngularMedia);
}