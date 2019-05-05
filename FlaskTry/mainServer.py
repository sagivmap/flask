from flask import Flask, render_template, request, redirect, send_from_directory, send_file
from AlgorithmSolver import createJson as cJson
from Crawler.FBCrawler import FBCrawler
import os
import json
import math
import threading
app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
PATH_TO_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static','graphFile.json')

ID_FOR_NODE = 1

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PATH_TO_JSON'] = PATH_TO_JSON
app.config['ID_FOR_NODE'] = 1
@app.route('/')
def main():
    return render_template('index.html')

class myThread (threading.Thread):
    """
    Thread class which each one execute part of first circle friends and all their second circle friends.
    """
    def __init__(self, facebook_crawler, threadID, name, paths):
        threading.Thread.__init__(self, name=name)
        self.facebook_crawler = facebook_crawler
        self.threadID = threadID
        self.name = name
        self.paths = paths


    def run(self):
        #logger.info("Starting work on thread: " + self.name)
        for path in self.paths:
            self.facebook_crawler.crawl_data_of_user_friends(path, self.threadID)
        #logger.info("Finished work on thread: " + self.name)

def crawl_facebook():
    email = request.form['emailForFacebook']
    password = request.form['passwordForFacebook']
    fbc = FBCrawler("FromWebSite")
    #fbc.run_selenium_browser()
    csv_file_name = fbc.initiate_csv_file()
    session_cookies, session = fbc.login_to_facebook(email, password)
    while not session_cookies and not session:
        session_cookies, session = fbc.login_to_facebook(email, password)
    fbc.get_facebook_username(session_cookies, session)
    first_circle_initial_data_folder, num_of_pages = fbc.get_user_first_circle_friends_initial_scan_data(
        session_cookies,
        session)
    config, utils = fbc.get_config_and_utils()
    num_of_threads = math.ceil(num_of_pages / config.getint('General', 'num_of_json_per_thread'))
    paths_for_each_thread = utils.get_paths_for_each_thread(first_circle_initial_data_folder,
                                                            config.getint('General', 'num_of_json_per_thread'))

    fbc.initiate_osn_dicts_and_sessions(num_of_threads, email, password)

    threadList = []
    for i in range(0, num_of_threads):
        threadList.append('Thread-' + str(i))

    i = 0
    threads = []
    for tName in threadList:
        thread = myThread(fbc, i, tName, paths_for_each_thread[i])
        thread.start()
        threads.append(thread)
        i += 1

    for t in threads:
        t.join()
    path_to_csv = fbc.arrange_csv_file_from_mid_data(fbc.json_files_folder, 'data/' + csv_file_name)
    full_path_to_csv = os.path.join(os.getcwd(), path_to_csv)
    return send_file(full_path_to_csv,
                     as_attachment=True, attachment_filename='crawled.csv')

def crawl_twitter():
    nick_name = request.form['twitterName']
    print(nick_name[1:])
    return render_template('index.html')

def upload_file():
    # check if the post request has the file part
    if 'file' not in request.files:
        return redirect(request.url)

    file = request.files['file']

    if file:
        path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(path)

        cJson.create(path, 1)

        return render_template('showGraph.html')

def upload_twitter_file():
    # check if the post request has the file part
    if 'file' not in request.files:
        return redirect(request.url)

    file = request.files['file']

    if file:
        path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(path)

        cJson.create(path,2)

        return render_template('showGraph.html')

@app.route('/', methods=['POST'])
def handle_posts():
    if request.method == 'POST':
        if request.form["button"]=="Crawl":
            return crawl_facebook()
        elif request.form["button"]=="Upload":
            return upload_file()
        elif request.form["button"]=="CrawlTwitter":
            return crawl_twitter()
        elif request.form["button"] == "MoveToManuallyAddPage":
            return render_template('addManuallyPage.html')
        elif request.form["button"] == 'UploadTwitter':
            return upload_twitter_file()


if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    env = app.jinja_env
    env.cache = None
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True)
